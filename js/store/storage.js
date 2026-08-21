// storage.js - LocalStorage wrapper v4
// SIMPLIFICAÇÃO: sem histórico mensal, sem confirmedPeriods, sem salaryHistory.
// - Todo contrato cadastrado é ativo.
// - Salário fica direto no objeto pessoa (person.salary).
// - CURRENT_PERIOD é apenas o "mês de referência" pra projetos pontuais e relatórios.
// - Firebase Firestore: sync em segundo plano, mesmo modelo anterior.

import { FIRESTORE_COLLECTION, FIRESTORE_DOC_ID } from '../firebaseConfig.js';
import { getFirebaseApp } from '../firebaseApp.js';

class Storage {
    constructor() {
        this.keys = {
            CONTRACTS:      'agency_contracts',
            PEOPLE:         'agency_people',
            SQUADS:         'agency_squads',
            CURRENT_PERIOD: 'agency_current_period',
            PROJECTS:       'agency_projects',
        };

        this._firestoreDocRef = null;
        this._firestoreFns = null;
        this._syncTimer = null;
        this._firebaseReady = false;

        this._firebaseInitPromise = this._initFirebase();
        this.initStorage();
    }

    async _initFirebase() {
        try {
            const app = await getFirebaseApp();
            const { getFirestore, doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
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
        if (!localStorage.getItem(this.keys.PEOPLE))    this.savePeople([]);
        if (!localStorage.getItem(this.keys.SQUADS))    this.saveSquads([]);
        if (!localStorage.getItem(this.keys.PROJECTS))  this.saveProjects([]);

        if (!localStorage.getItem(this.keys.CURRENT_PERIOD)) {
            const now = new Date();
            const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            localStorage.setItem(this.keys.CURRENT_PERIOD, id);
        }

        this._migrate();
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ====================
    // MIGRAÇÃO (única, idempotente)
    // ====================
    // Converte dados de versões anteriores (confirmedPeriods, monthlyProjections,
    // assignedPeople, salaryHistory) para o modelo v4 simplificado.

    _migrate() {
        try {
            const contracts = this.getContracts();
            let changed = false;

            contracts.forEach(contract => {
                // v3 → v4: modelo de entregáveis
                if (contract.videoCount === undefined)  { contract.videoCount = 0;  changed = true; }
                if (contract.staticCount === undefined) { contract.staticCount = 0; changed = true; }
                if (!contract.peopleAllocations) {
                    const oldAssigned = contract.assignedPeople || [];
                    contract.peopleAllocations = oldAssigned.map(personId => ({ personId, mode: 'rateado', fixedValue: 0 }));
                    changed = true;
                }
                if (contract.trafficManagement === undefined) { contract.trafficManagement = false; changed = true; }
                if (contract.founderBrand === undefined)       { contract.founderBrand = false;      changed = true; }

                // v3 → v4: confirmedPeriods não existe mais.
                // Contratos que tinham pelo menos um mês confirmado continuam
                // ativos. Contratos que nunca foram confirmados ficam inativos.
                if (contract.confirmedPeriods !== undefined) {
                    if (contract.active === undefined) {
                        contract.active = (contract.confirmedPeriods.length > 0);
                    }
                    delete contract.confirmedPeriods;
                    changed = true;
                }

                // Garante que o campo active existe em todos os contratos
                if (contract.active === undefined) {
                    contract.active = true;
                    changed = true;
                }

                contract._v3Migrated = true;
            });

            // Limpar chaves obsoletas do localStorage
            ['agency_periods', 'agency_salary_history'].forEach(k => {
                if (localStorage.getItem(k)) { localStorage.removeItem(k); changed = true; }
            });

            if (changed) {
                this.saveContracts(contracts);
                console.log('✅ storage: migração v4 concluída (sem histórico mensal)');
            }
        } catch (e) {
            console.error('Erro na migração v4:', e);
        }
    }

    // ====================
    // FIREBASE SYNC
    // ====================

    _collectAllData() {
        return {
            contracts:     JSON.parse(localStorage.getItem(this.keys.CONTRACTS) || '[]'),
            people:        JSON.parse(localStorage.getItem(this.keys.PEOPLE) || '[]'),
            squads:        JSON.parse(localStorage.getItem(this.keys.SQUADS) || '[]'),
            currentPeriod: localStorage.getItem(this.keys.CURRENT_PERIOD) || null,
            projects:      JSON.parse(localStorage.getItem(this.keys.PROJECTS) || '[]'),
            updatedAt:     new Date().toISOString(),
        };
    }

    _applyAllData(data) {
        if (!data) return;
        if (data.contracts)     localStorage.setItem(this.keys.CONTRACTS, JSON.stringify(data.contracts));
        if (data.people)        localStorage.setItem(this.keys.PEOPLE, JSON.stringify(data.people));
        if (data.squads)        localStorage.setItem(this.keys.SQUADS, JSON.stringify(data.squads));
        if (data.currentPeriod) localStorage.setItem(this.keys.CURRENT_PERIOD, data.currentPeriod);
        if (data.projects)      localStorage.setItem(this.keys.PROJECTS, JSON.stringify(data.projects));
    }

    _hasRealData(data) {
        return !!data && (
            (data.people    && data.people.length    > 0) ||
            (data.squads    && data.squads.length    > 0) ||
            (data.contracts && data.contracts.length > 0)
        );
    }

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
    // CONTRACTS
    // ====================

    getContracts() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.CONTRACTS)) || [];
        } catch (e) { return []; }
    }

    saveContracts(contracts) {
        try {
            localStorage.setItem(this.keys.CONTRACTS, JSON.stringify(contracts));
            this._scheduleFirestoreSync();
            return true;
        } catch (e) { return false; }
    }

    /** Todo contrato cadastrado é ativo. O parâmetro periodId é ignorado
     *  (mantido por compatibilidade com os serviços que ainda o passam). */
    getActiveContractsForPeriod(_periodId) {
        return this.getContracts().filter(c => c.active !== false);
    }

    addContract(contract) {
        const contracts = this.getContracts();
        contract.id = this.generateId();
        contract.createdAt = new Date().toISOString();
        if (contract.videoCount    === undefined) contract.videoCount    = 0;
        if (contract.staticCount   === undefined) contract.staticCount   = 0;
        if (contract.trafficManagement === undefined) contract.trafficManagement = false;
        if (contract.founderBrand  === undefined) contract.founderBrand  = false;
        if (!contract.peopleAllocations) contract.peopleAllocations = [];
        if (contract.active        === undefined) contract.active        = true;
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
        this.saveContracts(this.getContracts().filter(c => c.id !== id));
        return true;
    }

    getContractById(id) {
        return this.getContracts().find(c => c.id === id) || null;
    }

    // ====================
    // PEOPLE
    // ====================

    getPeople() {
        try { return JSON.parse(localStorage.getItem(this.keys.PEOPLE)) || []; }
        catch (e) { return []; }
    }

    savePeople(people) {
        try {
            localStorage.setItem(this.keys.PEOPLE, JSON.stringify(people));
            this._scheduleFirestoreSync();
            return true;
        } catch (e) { return false; }
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
        this.savePeople(this.getPeople().filter(p => p.id !== id));
        return true;
    }

    getPersonById(id) {
        return this.getPeople().find(p => p.id === id) || null;
    }

    // ====================
    // SQUADS
    // ====================

    getSquads() {
        try { return JSON.parse(localStorage.getItem(this.keys.SQUADS)) || []; }
        catch (e) { return []; }
    }

    saveSquads(squads) {
        try {
            localStorage.setItem(this.keys.SQUADS, JSON.stringify(squads));
            this._scheduleFirestoreSync();
            return true;
        } catch (e) { return false; }
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
        this.saveSquads(this.getSquads().filter(s => s.id !== id));
        return true;
    }

    getSquadById(id) {
        return this.getSquads().find(s => s.id === id) || null;
    }

    // ====================
    // PERÍODO DE REFERÊNCIA
    // (apenas mês/ano exibido nos relatórios e filtro de projetos pontuais)
    // ====================

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
    }

    // Compatibilidade: métodos que o código legado ainda chama mas agora
    // não fazem nada ou retornam o equivalente mais simples.
    getPeriod(periodId) {
        const [year, month] = periodId.split('-');
        const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return { id: periodId, month: parseInt(month), year: parseInt(year), label: `${names[parseInt(month)-1]}/${year}` };
    }
    getPeriods() { return []; }

    // Sem mais salaryHistory — lê direto do objeto pessoa
    getSalaryForPeriod(personId, _periodId) {
        const person = this.getPersonById(personId);
        return person ? (person.salary || 0) : 0;
    }
    setSalaryForPeriod(personId, _periodId, salary) {
        this.updatePerson(personId, { salary });
    }

    // ====================
    // PROJECTS (PONTUAIS)
    // ====================

    getProjects() {
        try { return JSON.parse(localStorage.getItem(this.keys.PROJECTS)) || []; }
        catch (e) { return []; }
    }

    saveProjects(projects) {
        try {
            localStorage.setItem(this.keys.PROJECTS, JSON.stringify(projects));
            this._scheduleFirestoreSync();
            return true;
        } catch (e) { return false; }
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
        this.saveProjects(this.getProjects().filter(p => p.id !== id));
        return true;
    }

    getProjectById(id) {
        return this.getProjects().find(p => p.id === id) || null;
    }

    getDeliverableTypes() {
        return [{ id: 'video', name: 'Vídeo' }, { id: 'estatico', name: 'Estático' }];
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
            contracts:     this.getContracts(),
            people:        this.getPeople(),
            squads:        this.getSquads(),
            currentPeriod: this.getCurrentPeriod(),
            projects:      this.getProjects(),
            exportedAt:    new Date().toISOString()
        };
    }

    importData(data) {
        try {
            if (data.contracts)     this.saveContracts(data.contracts);
            if (data.people)        this.savePeople(data.people);
            if (data.squads)        this.saveSquads(data.squads);
            if (data.currentPeriod) this.setCurrentPeriod(data.currentPeriod);
            if (data.projects)      this.saveProjects(data.projects);
            this._migrate();
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    }
}

export default new Storage();
