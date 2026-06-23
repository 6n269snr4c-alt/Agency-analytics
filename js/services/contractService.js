// contractService.js - v3: vídeo/estático + peopleAllocations (rateado|fixo)

import storage from '../store/storage.js';

class ContractService {

    getAllContracts() {
        const currentPeriod = storage.getCurrentPeriod();
        return storage.getActiveContractsForPeriod(currentPeriod);
    }

    getContractById(id) {
        return storage.getContractById(id);
    }

    getContract(id) {
        return this.getContractById(id);
    }

    createContract(contractData) {
        if (!contractData.client || !contractData.value) {
            throw new Error('Cliente e valor são obrigatórios');
        }

        const currentPeriod = storage.getCurrentPeriod();

        const contract = {
            client:             contractData.client,
            value:              parseFloat(contractData.value),
            baseValue:          parseFloat(contractData.baseValue || contractData.value),
            videoCount:         parseInt(contractData.videoCount) || 0,
            staticCount:        parseInt(contractData.staticCount) || 0,
            peopleAllocations:  contractData.peopleAllocations || [],
            duration:           contractData.duration || 12,
            startPeriod:        contractData.startPeriod || currentPeriod,
            status:             contractData.status || 'active',
            squadTag:           contractData.squadTag || null,
            notes:              contractData.notes || '',
        };

        const saved = storage.addContract(contract);
        storage.generateContractProjections(saved.id);
        return saved;
    }

    updateContract(id, updates) {
        const contract = storage.getContractById(id);
        if (!contract) throw new Error('Contrato não encontrado');

        if (updates.value !== undefined) {
            updates.value     = parseFloat(updates.value);
            updates.baseValue = parseFloat(updates.baseValue || updates.value);
        }
        if (updates.videoCount !== undefined)  updates.videoCount  = parseInt(updates.videoCount)  || 0;
        if (updates.staticCount !== undefined) updates.staticCount = parseInt(updates.staticCount) || 0;
        if (!updates.status) updates.status = contract.status || 'active';

        const updated = storage.updateContract(id, updates);

        const needsRegen = ['value', 'baseValue', 'videoCount', 'staticCount', 'peopleAllocations', 'duration', 'startPeriod']
            .some(k => updates[k] !== undefined);

        if (needsRegen) {
            storage.generateContractProjections(id);
        }

        return updated;
    }

    deleteContract(id) {
        return storage.deleteContract(id);
    }

    /**
     * Duplica um contrato: copia cliente, squad, pessoas/modos e quantidades.
     */
    duplicateContract(id, overrides = {}) {
        const original = storage.getContractById(id);
        if (!original) throw new Error('Contrato não encontrado');

        const currentPeriod = storage.getCurrentPeriod();

        const newContractData = {
            client:            overrides.client ?? original.client,
            value:             overrides.value ?? original.value,
            videoCount:        overrides.videoCount ?? original.videoCount ?? 0,
            staticCount:       overrides.staticCount ?? original.staticCount ?? 0,
            peopleAllocations: (original.peopleAllocations || []).map(a => ({ ...a })),
            duration:          overrides.duration ?? original.duration ?? 12,
            startPeriod:       overrides.startPeriod ?? currentPeriod,
            squadTag:          original.squadTag ?? null,
            notes:             original.notes ?? '',
        };

        return this.createContract(newContractData);
    }

    searchContracts(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAllContracts().filter(contract =>
            contract.client.toLowerCase().includes(lowerQuery) ||
            (contract.notes && contract.notes.toLowerCase().includes(lowerQuery))
        );
    }

    getContractsBySquad(squadId) {
        return storage.getContracts().filter(c => c.squadTag === squadId);
    }

    getContractsByPerson(personId) {
        return storage.getContracts().filter(contract =>
            (contract.peopleAllocations || []).some(a => a.personId === personId)
        );
    }

    setPersonAllocation(contractId, personId, mode, fixedValue = 0) {
        const contract = storage.getContractById(contractId);
        if (!contract) throw new Error('Contrato não encontrado');

        const allocations = [...(contract.peopleAllocations || [])];
        const idx = allocations.findIndex(a => a.personId === personId);
        const entry = { personId, mode, fixedValue: mode === 'fixo' ? (parseFloat(fixedValue) || 0) : 0 };

        if (idx >= 0) allocations[idx] = entry;
        else allocations.push(entry);

        return this.updateContract(contractId, { peopleAllocations: allocations });
    }

    removePersonAllocation(contractId, personId) {
        const contract = storage.getContractById(contractId);
        if (!contract) throw new Error('Contrato não encontrado');

        const allocations = (contract.peopleAllocations || []).filter(a => a.personId !== personId);
        return this.updateContract(contractId, { peopleAllocations: allocations });
    }

    assignSquad(contractId, squadId) {
        const squad = storage.getSquadById(squadId);
        if (!squad) throw new Error('Squad não encontrado');
        return storage.updateContract(contractId, { squadTag: squadId });
    }

    getTotalRevenue() {
        return this.getAllContracts().reduce((total, c) => total + (c.value || 0), 0);
    }

    getContractCount() {
        return this.getAllContracts().length;
    }
}

export default new ContractService();
