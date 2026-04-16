// personService.js - People management business logic

import storage from '../store/storage.js';

class PersonService {
    createPerson(personData) {
        // Validate required fields
        if (!personData.name || !personData.role || personData.salary === undefined) {
            throw new Error('Nome, cargo e salário são obrigatórios');
        }

        // Create person
        const person = storage.addPerson({
            name: personData.name,
            role: personData.role,
            salary: parseFloat(personData.salary)
        });

        return person;
    }

    updatePerson(id, updates) {
        const person = storage.getPersonById(id);
        if (!person) {
            throw new Error('Pessoa não encontrada');
        }

        // Validate salary if being updated
        if (updates.salary !== undefined) {
            updates.salary = parseFloat(updates.salary);
        }

        return storage.updatePerson(id, updates);
    }

    deletePerson(id) {
        const person = storage.getPersonById(id);
        if (!person) {
            throw new Error('Pessoa não encontrada');
        }

        // Check if person is assigned to any contract directly
        const contracts = storage.getContracts();
        const isAssigned = contracts.some(contract => 
            contract.assignedPeople && contract.assignedPeople.includes(id)
        );

        if (isAssigned) {
            throw new Error('Não é possível excluir uma pessoa que está atribuída a contratos. Remova as atribuições primeiro.');
        }

        return storage.deletePerson(id);
    }

    getPerson(id) {
        return storage.getPersonById(id);
    }

    getAllPeople() {
        return storage.getPeople();
    }

    searchPeople(query) {
        const people = storage.getPeople();
        const lowerQuery = query.toLowerCase();
        
        return people.filter(person => 
            person.name.toLowerCase().includes(lowerQuery) ||
            person.role.toLowerCase().includes(lowerQuery)
        );
    }

    getPeopleByRole(role) {
        const people = storage.getPeople();
        return people.filter(person => person.role === role);
    }

    getAllRoles() {
        const people = storage.getPeople();
        const roles = new Set(people.map(p => p.role));
        return Array.from(roles).sort();
    }

    getTotalSalaries() {
        const people = storage.getPeople();
        return people.reduce((total, person) => total + person.salary, 0);
    }

    getPeopleCount() {
        return storage.getPeople().length;
    }

    isPersonInSquad(personId) {
        const squads = storage.getSquads();
        return squads.some(squad => squad.members.includes(personId));
    }

    getPersonSquads(personId) {
        const squads = storage.getSquads();
        return squads.filter(squad => squad.members.includes(personId));
    }

    getPersonSquadNames(personId) {
        const squads = this.getPersonSquads(personId);
        return squads.map(s => s.name);
    }
}

export default new PersonService();
