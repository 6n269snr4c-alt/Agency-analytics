// storage.js - LocalStorage wrapper para dados da aplicação
// VERSÃO COMPLETA COM SISTEMA DE PESOS

class Storage {
    constructor() {
        this.keys = {
            CONTRACTS: 'agency_contracts',
            PEOPLE: 'agency_people',
            SQUADS: 'agency_squads',
            DELIVERABLE_TYPES: 'agency_deliverable_types',
            ROLES: 'agency_roles',  // Sistema de Pesos
            CURRENT_PERIOD: 'agency_current_period'
        };
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
    // PERIODS
    // ====================
    
    getCurrentPeriod() {
        try {
            return localStorage.getItem(this.keys.CURRENT_PERIOD) || new Date().toISOString().slice(0, 7);
        } catch (e) {
            return new Date().toISOString().slice(0, 7);
        }
    }

    setCurrentPeriod(period) {
        localStorage.setItem(this.keys.CURRENT_PERIOD, period);
    }

    // ====================
    // UTILITY
    // ====================
    
    clearAll() {
        Object.values(this.keys).forEach(key => {
            localStorage.removeItem(key);
        });
        return true;
    }

    exportData() {
        return {
            contracts: this.getContracts(),
            people: this.getPeople(),
            squads: this.getSquads(),
            deliverableTypes: this.getDeliverableTypes(),
            roles: this.getRoles(),
            currentPeriod: this.getCurrentPeriod()
        };
    }

    importData(data) {
        if (data.contracts) this.saveContracts(data.contracts);
        if (data.people) this.savePeople(data.people);
        if (data.squads) this.saveSquads(data.squads);
        if (data.deliverableTypes) this.saveDeliverableTypes(data.deliverableTypes);
        if (data.roles) this.saveRoles(data.roles);
        if (data.currentPeriod) this.setCurrentPeriod(data.currentPeriod);
        return true;
    }
}

export default new Storage();
