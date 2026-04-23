// storage.js - LocalStorage wrapper COMPLETO
// TODOS OS MÉTODOS NECESSÁRIOS PARA O SISTEMA

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
            PAYROLL_PER_PERIOD: 'agency_payroll_per_period'
        };
        this.initStorage();
    }

    initStorage() {
        // Initialize empty arrays if nothing exists
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
        
        // Initialize period-based data
        if (!localStorage.getItem(this.keys.PERIODS)) {
            this.savePeriods([]);
        }
        if (!localStorage.getItem(this.keys.CONTRACTS_PER_PERIOD)) {
            localStorage.setItem(this.keys.CONTRACTS_PER_PERIOD, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.keys.PAYROLL_PER_PERIOD)) {
            localStorage.setItem(this.keys.PAYROLL_PER_PERIOD, JSON.stringify([]));
        }
        
        // Set current period to current month if not set
        if (!localStorage.getItem(this.keys.CURRENT_PERIOD)) {
            const now = new Date();
            const currentPeriodId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            this.setCurrentPeriod(currentPeriodId);
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
        return this.getContracts().find(c => c.id === id);
    }

    // ====================
    // PEOPLE
    // ====================
    
    getPeople() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.PEOPLE)) || [];
        } catch (e) {
            console.error('Error loading people:', e);
            return [];
        }
    }

    savePeople(people) {
        try {
            localStorage.setItem(this.keys.PEOPLE, JSON.stringify(people));
            return true;
        } catch (e) {
            console.error('Error saving people:', e);
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
        return this.getPeople().find(p => p.id === id);
    }

    // ====================
    // SQUADS
    // ====================
    
    getSquads() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.SQUADS)) || [];
        } catch (e) {
            console.error('Error loading squads:', e);
            return [];
        }
    }

    saveSquads(squads) {
        try {
            localStorage.setItem(this.keys.SQUADS, JSON.stringify(squads));
            return true;
        } catch (e) {
            console.error('Error saving squads:', e);
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
        return this.getSquads().find(s => s.id === id);
    }

    // ====================
    // DELIVERABLE TYPES
    // ====================
    
    getDeliverableTypes() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.DELIVERABLE_TYPES)) || [];
        } catch (e) {
            console.error('Error loading deliverable types:', e);
            return [];
        }
    }

    saveDeliverableTypes(types) {
        try {
            localStorage.setItem(this.keys.DELIVERABLE_TYPES, JSON.stringify(types));
            return true;
        } catch (e) {
            console.error('Error saving deliverable types:', e);
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
            types[index] = { ...types[index], ...updates, updatedAt: new Date().toISOString() };
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
        return this.getDeliverableTypes().find(t => t.id === id);
    }

    // ====================
    // ROLES (SISTEMA DE PESOS)
    // ====================
    
    getRoles() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.ROLES)) || [];
        } catch (e) {
            console.error('Error loading roles:', e);
            return [];
        }
    }

    saveRoles(roles) {
        try {
            localStorage.setItem(this.keys.ROLES, JSON.stringify(roles));
            return true;
        } catch (e) {
            console.error('Error saving roles:', e);
            return false;
        }
    }

    addRole(role) {
        const roles = this.getRoles();
        role.id = this.generateId();
        role.createdAt = new Date().toISOString();
        roles.push(role);
        this.saveRoles(roles);
        return role;
    }

    updateRole(id, updates) {
        const roles = this.getRoles();
        const index = roles.findIndex(r => r.id === id);
        if (index !== -1) {
            roles[index] = { ...roles[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveRoles(roles);
            return roles[index];
        }
        return null;
    }

    deleteRole(id) {
        const roles = this.getRoles().filter(r => r.id !== id);
        this.saveRoles(roles);
        return true;
    }

    getRoleById(id) {
        return this.getRoles().find(r => r.id === id);
    }

    getRoleByName(name) {
        return this.getRoles().find(r => r.name === name);
    }

    // ====================
    // PERIODS (SISTEMA DE PERÍODOS)
    // ====================
    
    getPeriods() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.PERIODS)) || [];
        } catch (e) {
            console.error('Error loading periods:', e);
            return [];
        }
    }

    savePeriods(periods) {
        try {
            localStorage.setItem(this.keys.PERIODS, JSON.stringify(periods));
            return true;
        } catch (e) {
            console.error('Error saving periods:', e);
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
        
        // Se não existir, criar período
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
        
        // Create period if it doesn't exist
        this.getPeriod(periodId);
    }

    // Contracts Per Period
    getContractsPerPeriod() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.CONTRACTS_PER_PERIOD)) || [];
        } catch (e) {
            console.error('Error loading contracts per period:', e);
            return [];
        }
    }

    getContractsForPeriod(periodId) {
        const allData = this.getContractsPerPeriod();
        const periodData = allData.find(p => p.periodId === periodId);
        return periodData ? periodData.contracts : [];
    }

    saveContractsForPeriod(periodId, contracts) {
        const allData = this.getContractsPerPeriod();
        const existingIndex = allData.findIndex(p => p.periodId === periodId);
        
        if (existingIndex >= 0) {
            allData[existingIndex] = { periodId, contracts };
        } else {
            allData.push({ periodId, contracts });
        }
        
        localStorage.setItem(this.keys.CONTRACTS_PER_PERIOD, JSON.stringify(allData));
    }

    // Payroll Per Period
    getPayrollPerPeriod() {
        try {
            return JSON.parse(localStorage.getItem(this.keys.PAYROLL_PER_PERIOD)) || [];
        } catch (e) {
            console.error('Error loading payroll per period:', e);
            return [];
        }
    }

    getPayrollForPeriod(periodId) {
        const allData = this.getPayrollPerPeriod();
        const periodData = allData.find(p => p.periodId === periodId);
        return periodData ? periodData.payroll : [];
    }

    savePayrollForPeriod(periodId, payroll) {
        const allData = this.getPayrollPerPeriod();
        const existingIndex = allData.findIndex(p => p.periodId === periodId);
        
        if (existingIndex >= 0) {
            allData[existingIndex] = { periodId, payroll };
        } else {
            allData.push({ periodId, payroll });
        }
        
        localStorage.setItem(this.keys.PAYROLL_PER_PERIOD, JSON.stringify(allData));
    }

    // Copy previous period data to new period
    copyPeriodData(fromPeriodId, toPeriodId) {
        // Copy contracts
        const contracts = this.getContractsForPeriod(fromPeriodId);
        this.saveContractsForPeriod(toPeriodId, contracts);
        
        // Copy payroll
        const payroll = this.getPayrollForPeriod(fromPeriodId);
        this.savePayrollForPeriod(toPeriodId, payroll);
        
        return true;
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
            contracts: this.getContracts(),
            people: this.getPeople(),
            squads: this.getSquads(),
            deliverableTypes: this.getDeliverableTypes(),
            roles: this.getRoles(),
            periods: this.getPeriods(),
            currentPeriod: this.getCurrentPeriod(),
            contractsPerPeriod: this.getContractsPerPeriod(),
            payrollPerPeriod: this.getPayrollPerPeriod(),
            exportedAt: new Date().toISOString()
        };
    }

    importData(data) {
        try {
            if (data.contracts) this.saveContracts(data.contracts);
            if (data.people) this.savePeople(data.people);
            if (data.squads) this.saveSquads(data.squads);
            if (data.deliverableTypes) this.saveDeliverableTypes(data.deliverableTypes);
            if (data.roles) this.saveRoles(data.roles);
            if (data.periods) this.savePeriods(data.periods);
            if (data.currentPeriod) this.setCurrentPeriod(data.currentPeriod);
            if (data.contractsPerPeriod) {
                localStorage.setItem(this.keys.CONTRACTS_PER_PERIOD, JSON.stringify(data.contractsPerPeriod));
            }
            if (data.payrollPerPeriod) {
                localStorage.setItem(this.keys.PAYROLL_PER_PERIOD, JSON.stringify(data.payrollPerPeriod));
            }
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    }
}

export default new Storage();
