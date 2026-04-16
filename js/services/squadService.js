// squadService.js - Squad management business logic

import storage from '../store/storage.js';

class SquadService {
    createSquad(squadData) {
        // Validate required fields
        if (!squadData.name) {
            throw new Error('Nome do squad é obrigatório');
        }

        // Validate head if provided
        if (squadData.headId) {
            const head = storage.getPersonById(squadData.headId);
            if (!head) {
                throw new Error('Head não encontrado');
            }
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
            headId: squadData.headId || null,
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

        // Validate head if being updated
        if (updates.headId !== undefined) {
            if (updates.headId) {
                const head = storage.getPersonById(updates.headId);
                if (!head) {
                    throw new Error('Head não encontrado');
                }
            }
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

    // NEW: Get all available people (anyone can be in multiple squads now)
    getAvailablePeople(squadId = null) {
        const people = storage.getPeople();
        
        if (squadId) {
            // When editing, show all people
            // They can be in multiple squads
            return people;
        }

        // When creating new squad, show all people
        return people;
    }

    // NEW: Check which squads a person belongs to
    getPersonSquads(personId) {
        const squads = storage.getSquads();
        return squads.filter(squad => squad.members.includes(personId));
    }

    // NEW: Get head of a squad
    getSquadHead(squadId) {
        const squad = storage.getSquadById(squadId);
        if (!squad || !squad.headId) return null;
        return storage.getPersonById(squad.headId);
    }

    // NEW: Check if person is head of any squad
    isPersonHead(personId) {
        const squads = storage.getSquads();
        return squads.some(squad => squad.headId === personId);
    }

    // NEW: Get squad where person is head
    getSquadWherePersonIsHead(personId) {
        const squads = storage.getSquads();
        return squads.find(squad => squad.headId === personId);
    }
}

export default new SquadService();
