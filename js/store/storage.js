// storage.js - LocalStorage wrapper COMPLETO COM SISTEMA MENSAL + PROJETOS PONTUAIS

class Storage {
    constructor() {
        this.keys = {
            CONTRACTS: 'agency_contracts',
            PEOPLE: 'agency_people',
            SQUADS: 'agency_squads',
            DELIVERABLE_TYPES: 'agency_deliverable_types',
            ROLES: 'agency_roles',
            PERIODS: 'agency_periods',
            CURRENT_PERIOD: 'agency_current_period',
            CONTRACTS_PER_PERIOD: 'agency_contracts_per_period',
            PAYROLL_PER_PERIOD: 'agency_payroll_per_period',
            SALARY_HISTORY: 'agency_salary_history',
            PROJECTS: 'agency_projects',  // ← NOVO
        };
        this.initStorage();
    }

    initStorage() {
        if (!localStorage.getItem(this.keys.CONTRACTS)) {
            this.saveContracts([]);
        }
        if (!localStorage.getItem(this.keys.PEOPLE)) {
            this.savePeople([]);
        }
        if (!localStorage.getItem(this.keys.SQUADS)) {
            this.saveSquads([]);
        }
        if (!localStorage.getItem(this.keys.DELIVERABLE_TYPES)) {
            this.saveDeliverableTypes([]);
        }
        if (!localStorage.getItem(this.keys.ROLES)) {
            this.saveRoles([]);
        }
        if (!localStorage.getItem(this.keys.PERIODS)) {
            this.savePeriods([]);
        }
        if (!localStorage.getItem(this.keys.CONTRACTS_PER_PERIOD)) {
            localStorage.setItem(this.keys.CONTRACTS_PER_PERIOD, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.keys.PAYROLL_PER_PERIOD)) {
            localStorage.setItem(this.keys.PAYROLL_PER_PERIOD, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.keys.SALARY_HISTORY)) {
            this.saveSalaryHistory([]);
        }
        if (!localStorage.getItem(this.keys.CURRENT_PERIOD)) {
            const now = new Date();
            const currentPeriodId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            this.setCurrentPeriod(currentPeriodId);
        }
        if (!localStorage.getItem(this.keys.PROJECTS)) {
            this.saveProjects([]);
        }

        // ── AUTO-CORREÇÃO: garantir status 'active' em contratos legados ──
        this._fixLegacyContractStatus();
    }

    // Corrige contratos antigos que não têm o campo status
    _fixLegacyContractStatus() {
        try {
            const contracts = this.getContracts();
            let changed = false;

            contracts.forEach(contract => {
                if (!contract.status) {
                    contract.status = 'active';
                    changed = true;
                }
            });

            if (changed) {
                this.saveContracts(contracts);
                console.log('✅ storage: status corrigido em contratos legados');
            }
        } catch (e) {
            console.error('Erro ao corrigir status de contratos:', e);
        }
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
        if (!contract.status) contract.status = 'active';
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
    // MONTHLY PROJECTIONS
    // ====================

    getContractProjection(contractId, periodId) {
        const contract = this.getContractById(contractId);
        if (!contract || !contract.monthlyProjections) return null;
        return contract.monthlyProjections.find(p => p.periodId === periodId) || null;
    }

    getActiveContractsForPeriod(periodId) {
        const contracts = this.getContracts();

        return contracts.filter(contract => {
            if (!contract.monthlyProjections || contract.monthlyProjections.length === 0) {
                return false;
            }

            const projection = contract.monthlyProjections.find(p => p.periodId === periodId);

            // status ausente (legado) = tratado como 'active'
            const isActive = !contract.status || contract.status === 'active';

            return projection && isActive;
        });
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
    // DELIVERABLE TYPES
    // ====================

    getDeliverableTypes() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.DELIVERABLE_TYPES)) || [];
        } catch (e) {
            return [];
        }
    }

    saveDeliverableTypes(types) {
        try {
            localStorage.setItem(this.keys.DELIVERABLE_TYPES, JSON.stringify(types));
            return true;
        } catch (e) {
            return false;
        }
    }

    addDeliverableType(type) {
        const types = this.getDeliverableTypes();
        type.id = this.generateId();
        type.createdAt = new Date().toISOString();
        types.push(type);
        this.saveDeliverableTypes(types);
        return type;
    }

    updateDeliverableType(id, updates) {
        const types = this.getDeliverableTypes();
        const index = types.findIndex(t => t.id === id);
        if (index !== -1) {
            types[index] = { ...types[index], ...updates };
            this.saveDeliverableTypes(types);
            return types[index];
        }
        return null;
    }

    deleteDeliverableType(id) {
        const types = this.getDeliverableTypes().filter(t => t.id !== id);
        this.saveDeliverableTypes(types);
        return true;
    }

    getDeliverableTypeById(id) {
        return this.getDeliverableTypes().find(t => t.id === id) || null;
    }

    // ====================
    // ROLES
    // ====================

    getRoles() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.ROLES)) || [];
        } catch (e) {
            return [];
        }
    }

    saveRoles(roles) {
        try {
            localStorage.setItem(this.keys.ROLES, JSON.stringify(roles));
            return true;
        } catch (e) {
            return false;
        }
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
            return true;
        } catch (e) {
            return false;
        }
    }

    getCurrentPeriod() {
        return localStorage.getItem(this.keys.CURRENT_PERIOD) || null;
    }

    setCurrentPeriod(periodId) {
        localStorage.setItem(this.keys.CURRENT_PERIOD, periodId);
    }

    // ====================
    // SALARY HISTORY
    // ====================

    getSalaryHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.SALARY_HISTORY)) || [];
        } catch (e) {
            return [];
        }
    }

    saveSalaryHistory(history) {
        try {
            localStorage.setItem(this.keys.SALARY_HISTORY, JSON.stringify(history));
            return true;
        } catch (e) {
            return false;
        }
    }

    getSalaryForPeriod(personId, periodId) {
        const history = this.getSalaryHistory();
        const entry = history.find(h => h.personId === personId && h.periodId === periodId);
        if (entry) return entry.salary;

        // Fallback: pegar o salário mais recente antes do período
        const personHistory = history
            .filter(h => h.personId === personId && h.periodId <= periodId)
            .sort((a, b) => b.periodId.localeCompare(a.periodId));

        if (personHistory.length > 0) return personHistory[0].salary;

        // Fallback final: salário base da pessoa
        const person = this.getPersonById(personId);
        return person ? (person.salary || 0) : 0;
    }

    getSalariesForPeriod(periodId) {
        const people = this.getPeople();
        return people.map(person => ({
            personId: person.id,
            name: person.name,
            salary: this.getSalaryForPeriod(person.id, periodId)
        }));
    }

    setSalaryForPeriod(personId, periodId, salary) {
        const history = this.getSalaryHistory();
        const index = history.findIndex(h => h.personId === personId && h.periodId === periodId);
        if (index !== -1) {
            history[index].salary = salary;
        } else {
            history.push({ personId, periodId, salary });
        }
        this.saveSalaryHistory(history);
    }

    // ====================
    // CONTRACTS PER PERIOD (legado)
    // ====================

    getContractsPerPeriod() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.CONTRACTS_PER_PERIOD)) || [];
        } catch (e) {
            return [];
        }
    }

    getPayrollPerPeriod() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.PAYROLL_PER_PERIOD)) || [];
        } catch (e) {
            return [];
        }
    }

    // ====================
    // PROJECTS (PONTUAIS) ← NOVO
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
        Object.values(this.keys).forEach(key => {
            localStorage.removeItem(key);
        });
        this.initStorage();
        return true;
    }

    exportData() {
        return {
            contracts:           this.getContracts(),
            people:              this.getPeople(),
            squads:              this.getSquads(),
            deliverableTypes:    this.getDeliverableTypes(),
            roles:               this.getRoles(),
            periods:             this.getPeriods(),
            currentPeriod:       this.getCurrentPeriod(),
            contractsPerPeriod:  this.getContractsPerPeriod(),
            payrollPerPeriod:    this.getPayrollPerPeriod(),
            salaryHistory:       this.getSalaryHistory(),
            projects:            this.getProjects(),
            exportedAt:          new Date().toISOString()
        };
    }

    importData(data) {
        try {
            if (data.contracts)          this.saveContracts(data.contracts);
            if (data.people)             this.savePeople(data.people);
            if (data.squads)             this.saveSquads(data.squads);
            if (data.deliverableTypes)   this.saveDeliverableTypes(data.deliverableTypes);
            if (data.roles)              this.saveRoles(data.roles);
            if (data.periods)            this.savePeriods(data.periods);
            if (data.currentPeriod)      this.setCurrentPeriod(data.currentPeriod);
            if (data.contractsPerPeriod) {
                localStorage.setItem(this.keys.CONTRACTS_PER_PERIOD, JSON.stringify(data.contractsPerPeriod));
            }
            if (data.payrollPerPeriod) {
                localStorage.setItem(this.keys.PAYROLL_PER_PERIOD, JSON.stringify(data.payrollPerPeriod));
            }
            if (data.salaryHistory)      this.saveSalaryHistory(data.salaryHistory);
            if (data.projects)           this.saveProjects(data.projects);
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    }
}

export default new Storage();
