// squadService.js - Squad management business logic

import storage from '../store/storage.js';

class SquadService {
    createSquad(squadData) {
        // Validate required fields
        if (!squadData.name) {
            throw new Error('Nome do squad é obrigatório');
        }

        // Validate members exist
        if (squadData.members && squadData.members.length > 0) {
            const people = storage.getPeople();
            const validMembers = squadData.members.filter(id => 
                people.some(p => p.id === id)
            );
            squadData.members = validMembers;
        } else {
            squadData.members = [];
        }

        // Create squad
        const squad = storage.addSquad({
            name: squadData.name,
            members: squadData.members,
            description: squadData.description || ''
        });

        return squad;
    }

    updateSquad(id, updates) {
        const squad = storage.getSquadById(id);
        if (!squad) {
            throw new Error('Squad não encontrado');
        }

        // Validate members if being updated
        if (updates.members) {
            const people = storage.getPeople();
            updates.members = updates.members.filter(memberId => 
                people.some(p => p.id === memberId)
            );
        }

        return storage.updateSquad(id, updates);
    }

    deleteSquad(id) {
        const squad = storage.getSquadById(id);
        if (!squad) {
            throw new Error('Squad não encontrado');
        }

        // Check if squad is assigned to any contract
        const contracts = storage.getContracts();
        const isAssigned = contracts.some(contract => contract.squadId === id);

        if (isAssigned) {
            throw new Error('Não é possível excluir um squad que está atribuído a contratos. Remova as atribuições primeiro.');
        }

        return storage.deleteSquad(id);
    }

    getSquad(id) {
        return storage.getSquadById(id);
    }

    getAllSquads() {
        return storage.getSquads();
    }

    searchSquads(query) {
        const squads = storage.getSquads();
        const lowerQuery = query.toLowerCase();
        
        return squads.filter(squad => 
            squad.name.toLowerCase().includes(lowerQuery) ||
            (squad.description && squad.description.toLowerCase().includes(lowerQuery))
        );
    }

    addMember(squadId, personId) {
        const squad = storage.getSquadById(squadId);
        if (!squad) {
            throw new Error('Squad não encontrado');
        }

        const person = storage.getPersonById(personId);
        if (!person) {
            throw new Error('Pessoa não encontrada');
        }

        if (squad.members.includes(personId)) {
            throw new Error('Pessoa já está no squad');
        }

        const updatedMembers = [...squad.members, personId];
        return storage.updateSquad(squadId, { members: updatedMembers });
    }

    removeMember(squadId, personId) {
        const squad = storage.getSquadById(squadId);
        if (!squad) {
            throw new Error('Squad não encontrado');
        }

        const updatedMembers = squad.members.filter(id => id !== personId);
        return storage.updateSquad(squadId, { members: updatedMembers });
    }

    getSquadMembers(squadId) {
        const squad = storage.getSquadById(squadId);
        if (!squad) {
            return [];
        }

        const people = storage.getPeople();
        return squad.members.map(memberId => 
            people.find(p => p.id === memberId)
        ).filter(Boolean);
    }

    getSquadCost(squadId) {
        const members = this.getSquadMembers(squadId);
        return members.reduce((total, member) => total + member.salary, 0);
    }

    getSquadCount() {
        return storage.getSquads().length;
    }

    getAvailablePeople(squadId = null) {
        const people = storage.getPeople();
        const squads = storage.getSquads();
        
        // Get all people who are in squads
        const peopleInSquads = new Set();
        squads.forEach(squad => {
            // Skip current squad if editing
            if (squadId && squad.id === squadId) return;
            squad.members.forEach(memberId => peopleInSquads.add(memberId));
        });

        // Return people not in any squad (or in current squad if editing)
        if (squadId) {
            const currentSquad = storage.getSquadById(squadId);
            return people.filter(person => 
                !peopleInSquads.has(person.id) || 
                (currentSquad && currentSquad.members.includes(person.id))
            );
        }

        return people.filter(person => !peopleInSquads.has(person.id));
    }
}

export default new SquadService();
