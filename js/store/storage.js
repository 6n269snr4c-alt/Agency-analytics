// storage.js - LocalStorage wrapper v3
// MODELO SIMPLIFICADO: contrato tem videoCount/staticCount + peopleAllocations (rateado|fixo)
// Sistema de pesos/pontos/entregáveis genéricos foi REMOVIDO.
//
// SINCRONIZAÇÃO COM FIREBASE: o localStorage continua sendo a fonte usada
// por todo o resto do app (leitura sempre síncrona, nada mudou ali). Por
// baixo, toda escrita também é replicada pro Firestore em segundo plano
// (_scheduleFirestoreSync), e no carregamento da página a gente decide se
// baixa os dados do Firestore (se ele já tiver algo) ou se sobe os dados
// locais pra lá (se o Firestore estiver vazio) — nunca o contrário, pra
// nunca apagar dados locais reais com algo vazio.

import { firebaseConfig, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID } from '../firebaseConfig.js';

class Storage {
    constructor() {
        this.keys = {
            CONTRACTS: 'agency_contracts',
            PEOPLE: 'agency_people',
            SQUADS: 'agency_squads',
            PERIODS: 'agency_periods',
            CURRENT_PERIOD: 'agency_current_period',
            SALARY_HISTORY: 'agency_salary_history',
            PROJECTS: 'agency_projects',
        };

        this._firestoreDocRef = null;
        this._firestoreFns = null;
        this._syncTimer = null;
        this._firebaseReady = false;

        // Import DINÂMICO de propósito: se a URL do CDN do Firebase ficar
        // inacessível (sem internet, bloqueio de rede etc.), um import
        // ESTÁTICO travaria o carregamento do storage.js inteiro — e isso
        // quebraria o app todo, já que toda página depende dele. Com
        // import() dinâmico dentro de uma Promise, qualquer falha aqui é
        // só capturada e ignorada; o resto do app nunca percebe.
        this._firebaseInitPromise = this._initFirebase();

        this.initStorage();
    }

    async _initFirebase() {
        try {
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
            const { getFirestore, doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            this._firestoreDocRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
            this._firestoreFns = { getDoc, setDoc };
            this._firebaseReady = true;
        } catch (e) {
            console.warn('⚠️ Firebase não configurado ou indisponível — funcionando só com localStorage.', e);
            this._firebaseReady = false;
        }
    }

    initStorage() {
        if (!localStorage.getItem(this.keys.CONTRACTS)) this.saveContracts([]);
        if (!localStorage.getItem(this.keys.PEOPLE)) this.savePeople([]);
        if (!localStorage.getItem(this.keys.SQUADS)) this.saveSquads([]);
        if (!localStorage.getItem(this.keys.PERIODS)) this.savePeriods([]);
        if (!localStorage.getItem(this.keys.SALARY_HISTORY)) this.saveSalaryHistory([]);
        if (!localStorage.getItem(this.keys.PROJECTS)) this.saveProjects([]);

        if (!localStorage.getItem(this.keys.CURRENT_PERIOD)) {
            const now = new Date();
            const currentPeriodId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            this.setCurrentPeriod(currentPeriodId);
        }

        this._migrateToV3();
        this._migrateToConfirmedPeriods();
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ====================
    // SINCRONIZAÇÃO COM FIREBASE
    // ====================

    /** Junta tudo que está no localStorage num objeto só, pra mandar pro Firestore. */
    _collectAllData() {
        return {
            contracts: JSON.parse(localStorage.getItem(this.keys.CONTRACTS) || '[]'),
            people: JSON.parse(localStorage.getItem(this.keys.PEOPLE) || '[]'),
            squads: JSON.parse(localStorage.getItem(this.keys.SQUADS) || '[]'),
            periods: JSON.parse(localStorage.getItem(this.keys.PERIODS) || '[]'),
            currentPeriod: localStorage.getItem(this.keys.CURRENT_PERIOD) || null,
            salaryHistory: JSON.parse(localStorage.getItem(this.keys.SALARY_HISTORY) || '[]'),
            projects: JSON.parse(localStorage.getItem(this.keys.PROJECTS) || '[]'),
            updatedAt: new Date().toISOString(),
        };
    }

    /** Grava um objeto de dados (vindo do Firestore) direto no localStorage. */
    _applyAllData(data) {
        if (!data) return;
        if (data.contracts)     localStorage.setItem(this.keys.CONTRACTS, JSON.stringify(data.contracts));
        if (data.people)        localStorage.setItem(this.keys.PEOPLE, JSON.stringify(data.people));
        if (data.squads)        localStorage.setItem(this.keys.SQUADS, JSON.stringify(data.squads));
        if (data.periods)       localStorage.setItem(this.keys.PERIODS, JSON.stringify(data.periods));
        if (data.currentPeriod) localStorage.setItem(this.keys.CURRENT_PERIOD, data.currentPeriod);
        if (data.salaryHistory) localStorage.setItem(this.keys.SALARY_HISTORY, JSON.stringify(data.salaryHistory));
        if (data.projects)      localStorage.setItem(this.keys.PROJECTS, JSON.stringify(data.projects));
    }

    /** Um documento do Firestore "tem dados de verdade" se tiver pelo menos
     *  uma pessoa, squad ou contrato — evita confundir "vazio" com "tem só
     *  período/configuração". */
    _hasRealData(data) {
        return !!data && (
            (data.people && data.people.length > 0) ||
            (data.squads && data.squads.length > 0) ||
            (data.contracts && data.contracts.length > 0)
        );
    }

    /** Envia o estado atual do localStorage pro Firestore, em segundo plano,
     *  sem bloquear quem chamou (a escrita local já aconteceu, isso aqui é
     *  só o espelho na nuvem). Debounced pra não disparar uma escrita por
     *  cada pequena mudança em sequência. */
    _scheduleFirestoreSync() {
        clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(async () => {
            await this._firebaseInitPromise;
            if (!this._firebaseReady) return;
            try {
                await this._firestoreFns.setDoc(this._firestoreDocRef, this._collectAllData());
            } catch (e) {
                console.warn('⚠️ Falha ao sincronizar com o Firestore (dados locais continuam intactos):', e);
            }
        }, 800);
    }

    /** Chamado uma vez, no carregamento do app (veja app.js). Decide a
     *  direção da sincronização com segurança: se o Firestore já tem dados
     *  reais, eles passam a valer (multi-dispositivo); se estiver vazio,
     *  sobe o que já existe localmente — nunca apaga dado local com algo
     *  vazio, e qualquer erro de rede/configuração só cai pro modo local. */
    async loadFromFirestore() {
        await this._firebaseInitPromise;
        if (!this._firebaseReady) return;
        try {
            const snap = await this._firestoreFns.getDoc(this._firestoreDocRef);
            const remote = snap.exists() ? snap.data() : null;

            if (this._hasRealData(remote)) {
                this._applyAllData(remote);
                console.log('☁️ Dados carregados do Firestore.');
            } else {
                await this._firestoreFns.setDoc(this._firestoreDocRef, this._collectAllData());
                console.log('☁️ Firestore estava vazio — dados locais enviados pra nuvem.');
            }
        } catch (e) {
            console.warn('⚠️ Não foi possível sincronizar com o Firestore agora. Usando dados locais.', e);
        }
    }

    // ====================
    // MIGRAÇÃO PARA V3
    // ====================
    // Contratos antigos tinham: deliverables{tipoId:qty}, assignedPeople:[ids]
    // Novo formato:             videoCount, staticCount, peopleAllocations:[{personId,mode,fixedValue}]

    _migrateToV3() {
        try {
            const contracts = this.getContracts();
            let changed = false;

            contracts.forEach(contract => {
                if (contract._v3Migrated) return;

                // Campos de entregável: zera (não há como inferir vídeo vs estático do formato antigo)
                if (contract.videoCount === undefined)  { contract.videoCount = 0;  changed = true; }
                if (contract.staticCount === undefined) { contract.staticCount = 0; changed = true; }

                // Pessoas: migra assignedPeople -> peopleAllocations em modo 'rateado'
                if (!contract.peopleAllocations) {
                    const oldAssigned = contract.assignedPeople || [];
                    contract.peopleAllocations = oldAssigned.map(personId => ({
                        personId,
                        mode: 'rateado',
                        fixedValue: 0
                    }));
                    changed = true;
                }

                contract._v3Migrated = true;
                changed = true;
            });

            // Limpar estruturas obsoletas do sistema de pesos, se existirem
            ['agency_deliverable_types', 'agency_roles_weights', 'agency_roles'].forEach(k => {
                if (localStorage.getItem(k)) localStorage.removeItem(k);
            });

            if (changed) {
                this.saveContracts(contracts);
                console.log('✅ storage: contratos migrados para modelo v3 (vídeo/estático + alocações)');
            }
        } catch (e) {
            console.error('Erro na migração v3:', e);
        }
    }

    // ====================
    // MIGRAÇÃO PARA CONFIRMAÇÃO MENSAL (confirmedPeriods)
    // ====================
    // Contratos do modelo anterior tinham monthlyProjections[{periodId,...}] e
    // contract.status ('active'/'inactive'). getActiveContractsForPeriod() antigo
    // considerava ativo qualquer mês presente em monthlyProjections, desde que o
    // contrato não estivesse com status 'inactive'. Migramos isso 1:1 para
    // confirmedPeriods, sem precisar redigitar nada.

    _migrateToConfirmedPeriods() {
        try {
            const contracts = this.getContracts();
            const currentPeriod = this.getCurrentPeriod();
            let changed = false;

            contracts.forEach(contract => {
                if (!contract.confirmedPeriods) {
                    const wasActive = !contract.status || contract.status === 'active';
                    const oldPeriods = Array.isArray(contract.monthlyProjections)
                        ? contract.monthlyProjections.map(p => p.periodId)
                        : [];
                    contract.confirmedPeriods = wasActive ? Array.from(new Set(oldPeriods)).sort() : [];
                    changed = true;
                }

                // Idempotente: remove meses futuros de confirmedPeriods, sejam de uma
                // migração anterior (bug já corrigido) ou de qualquer outra inconsistência.
                // Meses futuros nunca foram de fato confirmados — não existiam como ação manual.
                const cleaned = contract.confirmedPeriods.filter(p => p <= currentPeriod);
                if (cleaned.length !== contract.confirmedPeriods.length) {
                    contract.confirmedPeriods = cleaned;
                    changed = true;
                }

                if (contract.trafficManagement === undefined) {
                    contract.trafficManagement = false;
                    changed = true;
                }

                if (contract.founderBrand === undefined) {
                    contract.founderBrand = false;
                    changed = true;
                }
            });

            if (changed) {
                this.saveContracts(contracts);
                console.log('✅ storage: confirmedPeriods migrados/limpos (sem meses futuros indevidos)');
            }
        } catch (e) {
            console.error('Erro na migração para confirmedPeriods:', e);
        }
    }

    // ====================
    // CONTRACTS
    // ====================

    getContracts() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.CONTRACTS)) || [];
        } catch (e) {
            console.error('Error loading contracts:', e);
            return [];
        }
    }

    saveContracts(contracts) {
        try {
            localStorage.setItem(this.keys.CONTRACTS, JSON.stringify(contracts));
            this._scheduleFirestoreSync();
            return true;
        } catch (e) {
            console.error('Error saving contracts:', e);
            return false;
        }
    }

    addContract(contract) {
        const contracts = this.getContracts();
        contract.id = this.generateId();
        contract.createdAt = new Date().toISOString();
        if (contract.videoCount === undefined) contract.videoCount = 0;
        if (contract.staticCount === undefined) contract.staticCount = 0;
        if (contract.trafficManagement === undefined) contract.trafficManagement = false;
        if (contract.founderBrand === undefined) contract.founderBrand = false;
        if (!contract.peopleAllocations) contract.peopleAllocations = [];
        if (!contract.confirmedPeriods) contract.confirmedPeriods = [];
        contract._v3Migrated = true;
        contracts.push(contract);
        this.saveContracts(contracts);
        return contract;
    }

    updateContract(id, updates) {
        const contracts = this.getContracts();
        const index = contracts.findIndex(c => c.id === id);
        if (index !== -1) {
            contracts[index] = { ...contracts[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveContracts(contracts);
            return contracts[index];
        }
        return null;
    }

    deleteContract(id) {
        const contracts = this.getContracts().filter(c => c.id !== id);
        this.saveContracts(contracts);
        return true;
    }

    getContractById(id) {
        return this.getContracts().find(c => c.id === id) || null;
    }

    // ====================
    // CONTRATOS — confirmação mensal manual
    // ====================
    // Não há mais "duração" nem projeção automática. Cada contrato carrega um
    // único valor/squad/equipe (válidos enquanto não houver novo contrato), e
    // um array confirmedPeriods com os meses em que ele foi confirmado como
    // "continua igual". Qualquer mudança real (valor, entregáveis, squad,
    // equipe) deve gerar um contrato novo — ver contractService.duplicateContract.

    confirmContractPeriod(contractId, periodId) {
        const contracts = this.getContracts();
        const index = contracts.findIndex(c => c.id === contractId);
        if (index === -1) return null;

        const set = new Set(contracts[index].confirmedPeriods || []);
        set.add(periodId);
        contracts[index].confirmedPeriods = Array.from(set).sort();
        this.saveContracts(contracts);
        return contracts[index];
    }

    unconfirmContractPeriod(contractId, periodId) {
        const contracts = this.getContracts();
        const index = contracts.findIndex(c => c.id === contractId);
        if (index === -1) return null;

        contracts[index].confirmedPeriods = (contracts[index].confirmedPeriods || []).filter(p => p !== periodId);
        this.saveContracts(contracts);
        return contracts[index];
    }

    getActiveContractsForPeriod(periodId) {
        return this.getContracts().filter(c => (c.confirmedPeriods || []).includes(periodId));
    }

    // ====================
    // PEOPLE
    // ====================

    getPeople() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.PEOPLE)) || [];
        } catch (e) {
            return [];
        }
    }

    savePeople(people) {
        try {
            localStorage.setItem(this.keys.PEOPLE, JSON.stringify(people));
            this._scheduleFirestoreSync();
            return true;
        } catch (e) {
            return false;
        }
    }

    addPerson(person) {
        const people = this.getPeople();
        person.id = this.generateId();
        person.createdAt = new Date().toISOString();
        people.push(person);
        this.savePeople(people);
        return person;
    }

    updatePerson(id, updates) {
        const people = this.getPeople();
        const index = people.findIndex(p => p.id === id);
        if (index !== -1) {
            people[index] = { ...people[index], ...updates, updatedAt: new Date().toISOString() };
            this.savePeople(people);
            return people[index];
        }
        return null;
    }

    deletePerson(id) {
        const people = this.getPeople().filter(p => p.id !== id);
        this.savePeople(people);
        return true;
    }

    getPersonById(id) {
        return this.getPeople().find(p => p.id === id) || null;
    }

    // ====================
    // SQUADS
    // ====================

    getSquads() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.SQUADS)) || [];
        } catch (e) {
            return [];
        }
    }

    saveSquads(squads) {
        try {
            localStorage.setItem(this.keys.SQUADS, JSON.stringify(squads));
            this._scheduleFirestoreSync();
            return true;
        } catch (e) {
            return false;
        }
    }

    addSquad(squad) {
        const squads = this.getSquads();
        squad.id = this.generateId();
        squad.createdAt = new Date().toISOString();
        squads.push(squad);
        this.saveSquads(squads);
        return squad;
    }

    updateSquad(id, updates) {
        const squads = this.getSquads();
        const index = squads.findIndex(s => s.id === id);
        if (index !== -1) {
            squads[index] = { ...squads[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveSquads(squads);
            return squads[index];
        }
        return null;
    }

    deleteSquad(id) {
        const squads = this.getSquads().filter(s => s.id !== id);
        this.saveSquads(squads);
        return true;
    }

    getSquadById(id) {
        return this.getSquads().find(s => s.id === id) || null;
    }

    // ====================
    // PERIODS
    // ====================

    getPeriods() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.PERIODS)) || [];
        } catch (e) {
            return [];
        }
    }

    savePeriods(periods) {
        try {
            localStorage.setItem(this.keys.PERIODS, JSON.stringify(periods));
            this._scheduleFirestoreSync();
            return true;
        } catch (e) {
            return false;
        }
    }

    addPeriod(periodData) {
        const periods = this.getPeriods();
        const period = {
            id: periodData.id,
            month: periodData.month,
            year: periodData.year,
            label: periodData.label,
            createdAt: new Date().toISOString()
        };
        periods.push(period);
        this.savePeriods(periods);
        return period;
    }

    getPeriod(periodId) {
        const periods = this.getPeriods();
        let period = periods.find(p => p.id === periodId);

        if (!period) {
            const [year, month] = periodId.split('-');
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            period = {
                id: periodId,
                month: parseInt(month),
                year: parseInt(year),
                label: `${monthNames[parseInt(month) - 1]}/${year}`,
                startDate: `${periodId}-01`,
                endDate: `${periodId}-31`
            };
            this.addPeriod(period);
        }

        return period;
    }

    getCurrentPeriod() {
        try {
            return localStorage.getItem(this.keys.CURRENT_PERIOD) || new Date().toISOString().slice(0, 7);
        } catch (e) {
            return new Date().toISOString().slice(0, 7);
        }
    }

    setCurrentPeriod(periodId) {
        localStorage.setItem(this.keys.CURRENT_PERIOD, periodId);
        this._scheduleFirestoreSync();
        this.getPeriod(periodId);
    }

    // ====================
    // SALARY HISTORY
    // ====================

    getSalaryHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.SALARY_HISTORY)) || [];
        } catch (e) {
            console.error('Error loading salary history:', e);
            return [];
        }
    }

    saveSalaryHistory(history) {
        try {
            localStorage.setItem(this.keys.SALARY_HISTORY, JSON.stringify(history));
            this._scheduleFirestoreSync();
            return true;
        } catch (e) {
            console.error('Error saving salary history:', e);
            return false;
        }
    }

    getSalaryForPeriod(personId, periodId) {
        const history = this.getSalaryHistory();
        const entry = history.find(h => h.personId === personId && h.periodId === periodId);
        if (entry) return entry.salary;

        const personHistory = history
            .filter(h => h.personId === personId && h.periodId <= periodId)
            .sort((a, b) => b.periodId.localeCompare(a.periodId));
        if (personHistory.length > 0) return personHistory[0].salary;

        const person = this.getPersonById(personId);
        return person ? (person.salary || 0) : 0;
    }

    setSalaryForPeriod(personId, periodId, salary, status = 'active') {
        const history = this.getSalaryHistory();
        const existingIndex = history.findIndex(h => h.personId === personId && h.periodId === periodId);
        const entry = { personId, periodId, salary, status, updatedAt: new Date().toISOString() };
        if (existingIndex >= 0) {
            history[existingIndex] = entry;
        } else {
            history.push(entry);
        }
        this.saveSalaryHistory(history);
        return entry;
    }

    getSalariesForPeriod(periodId) {
        const history = this.getSalaryHistory();
        return history.filter(h => h.periodId === periodId && h.status === 'active');
    }

    copySalariesToNextPeriod(fromPeriodId, toPeriodId) {
        const salaries = this.getSalariesForPeriod(fromPeriodId);
        salaries.forEach(entry => {
            this.setSalaryForPeriod(entry.personId, toPeriodId, entry.salary, entry.status);
        });
        return salaries.length;
    }

    // Usado por periodService.createPeriodFromPrevious() ao avançar para um
    // período novo. No modelo v3, contratos já têm projeções próprias
    // (monthlyProjections/generateContractProjections), então a única coisa
    // que realmente precisa ser "copiada" entre períodos é o salário.
    copyPeriodData(fromPeriodId, toPeriodId) {
        return this.copySalariesToNextPeriod(fromPeriodId, toPeriodId);
    }

    // ====================
    // DELIVERABLE TYPES (lista fixa — apenas para o seletor de "entregáveis
    // padrão" no formulário de Projetos Pontuais. Alinhada ao modelo v3,
    // que só reconhece Vídeo/Estático. Não há add/update/delete: a lista é
    // fixa por design, igual ao resto do sistema.)
    // ====================

    getDeliverableTypes() {
        return [
            { id: 'video', name: 'Vídeo' },
            { id: 'estatico', name: 'Estático' }
        ];
    }

    getDeliverableTypeById(id) {
        return this.getDeliverableTypes().find(t => t.id === id) || null;
    }

    // ====================
    // PROJECTS (PONTUAIS)
    // ====================

    getProjects() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.PROJECTS)) || [];
        } catch (e) {
            console.error('Error loading projects:', e);
            return [];
        }
    }

    saveProjects(projects) {
        try {
            localStorage.setItem(this.keys.PROJECTS, JSON.stringify(projects));
            this._scheduleFirestoreSync();
            return true;
        } catch (e) {
            console.error('Error saving projects:', e);
            return false;
        }
    }

    addProject(project) {
        const projects = this.getProjects();
        project.id = this.generateId();
        project.createdAt = new Date().toISOString();
        projects.push(project);
        this.saveProjects(projects);
        return project;
    }

    updateProject(id, updates) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === id);
        if (index !== -1) {
            projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveProjects(projects);
            return projects[index];
        }
        return null;
    }

    deleteProject(id) {
        const projects = this.getProjects().filter(p => p.id !== id);
        this.saveProjects(projects);
        return true;
    }

    getProjectById(id) {
        return this.getProjects().find(p => p.id === id) || null;
    }

    // ====================
    // UTILITY
    // ====================

    clearAll() {
        Object.values(this.keys).forEach(key => localStorage.removeItem(key));
        this.initStorage();
        return true;
    }

    exportData() {
        return {
            contracts: this.getContracts(),
            people: this.getPeople(),
            squads: this.getSquads(),
            periods: this.getPeriods(),
            currentPeriod: this.getCurrentPeriod(),
            salaryHistory: this.getSalaryHistory(),
            projects: this.getProjects(),
            exportedAt: new Date().toISOString()
        };
    }

    importData(data) {
        try {
            if (data.contracts)     this.saveContracts(data.contracts);
            if (data.people)        this.savePeople(data.people);
            if (data.squads)        this.saveSquads(data.squads);
            if (data.periods)       this.savePeriods(data.periods);
            if (data.currentPeriod) this.setCurrentPeriod(data.currentPeriod);
            if (data.salaryHistory) this.saveSalaryHistory(data.salaryHistory);
            if (data.projects)      this.saveProjects(data.projects);
            this._migrateToV3();
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    }
}

export default new Storage();
