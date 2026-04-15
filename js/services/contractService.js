// contractService.js - Contract management business logic

import storage from '../store/storage.js';

class ContractService {
    createContract(contractData) {
        // Validate required fields
        if (!contractData.client || !contractData.value) {
            throw new Error('Cliente e valor são obrigatórios');
        }

        // Ensure deliverables is an object
        if (!contractData.deliverables) {
            contractData.deliverables = {};
        }

        // Create contract
        const contract = storage.addContract({
            client: contractData.client,
            value: parseFloat(contractData.value),
            deliverables: contractData.deliverables,
            squadId: contractData.squadId || null,
            assignedPeople: contractData.assignedPeople || [],
            notes: contractData.notes || ''
        });

        return contract;
    }

    updateContract(id, updates) {
        const contract = storage.getContractById(id);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        // Validate value if being updated
        if (updates.value !== undefined) {
            updates.value = parseFloat(updates.value);
        }

        return storage.updateContract(id, updates);
    }

    deleteContract(id) {
        return storage.deleteContract(id);
    }

    getContract(id) {
        return storage.getContractById(id);
    }

    getAllContracts() {
        return storage.getContracts();
    }

    searchContracts(query) {
        const contracts = storage.getContracts();
        const lowerQuery = query.toLowerCase();
        
        return contracts.filter(contract => 
            contract.client.toLowerCase().includes(lowerQuery) ||
            (contract.notes && contract.notes.toLowerCase().includes(lowerQuery))
        );
    }

    getContractsBySquad(squadId) {
        const contracts = storage.getContracts();
        return contracts.filter(contract => contract.squadId === squadId);
    }

    getContractsByPerson(personId) {
        const contracts = storage.getContracts();
        return contracts.filter(contract => {
            if (contract.assignedPeople && contract.assignedPeople.includes(personId)) {
                return true;
            }
            if (contract.squadId) {
                const squad = storage.getSquadById(contract.squadId);
                return squad && squad.members.includes(personId);
            }
            return false;
        });
    }

    addDeliverable(contractId, type, quantity) {
        const contract = storage.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        if (!contract.deliverables) {
            contract.deliverables = {};
        }

        contract.deliverables[type] = parseInt(quantity);
        return storage.updateContract(contractId, contract);
    }

    removeDeliverable(contractId, type) {
        const contract = storage.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        if (contract.deliverables && contract.deliverables[type]) {
            delete contract.deliverables[type];
            return storage.updateContract(contractId, contract);
        }

        return contract;
    }

    assignSquad(contractId, squadId) {
        const contract = storage.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        const squad = storage.getSquadById(squadId);
        if (!squad) {
            throw new Error('Squad não encontrado');
        }

        // Clear individual assignments when assigning squad
        return storage.updateContract(contractId, {
            squadId: squadId,
            assignedPeople: []
        });
    }

    assignPeople(contractId, personIds) {
        const contract = storage.getContractById(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        // Validate all people exist
        const people = storage.getPeople();
        const validIds = personIds.filter(id => 
            people.some(p => p.id === id)
        );

        // Clear squad assignment when assigning individual people
        return storage.updateContract(contractId, {
            assignedPeople: validIds,
            squadId: null
        });
    }

    getTotalRevenue() {
        const contracts = storage.getContracts();
        return contracts.reduce((total, contract) => total + contract.value, 0);
    }

    getContractCount() {
        return storage.getContracts().length;
    }
}

export default new ContractService();
