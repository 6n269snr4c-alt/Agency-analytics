// storage.js - LocalStorage wrapper with easy API migration path

class Storage {
    constructor() {
        this.keys = {
            CONTRACTS: 'agency_contracts',
            PEOPLE: 'agency_people',
            SQUADS: 'agency_squads'
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
    }

    // Contracts
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

    // People
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

    // Squads
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

    // Utilities
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    exportData() {
        return {
            contracts: this.getContracts(),
            people: this.getPeople(),
            squads: this.getSquads(),
            exportedAt: new Date().toISOString()
        };
    }

    importData(data) {
        try {
            if (data.contracts) this.saveContracts(data.contracts);
            if (data.people) this.savePeople(data.people);
            if (data.squads) this.saveSquads(data.squads);
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    }

    clearAll() {
        localStorage.removeItem(this.keys.CONTRACTS);
        localStorage.removeItem(this.keys.PEOPLE);
        localStorage.removeItem(this.keys.SQUADS);
        this.initStorage();
    }
}

export default new Storage();
