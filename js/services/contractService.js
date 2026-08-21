// contractService.js - v4: sem histórico mensal, sem confirmedPeriods.
// Todo contrato cadastrado é ativo. Edição direta sem restrições de histórico.

import storage from '../store/storage.js';

class ContractService {

    getAllContracts() {
        return storage.getActiveContractsForPeriod();
    }

    // Compatibilidade: calls antigas que passam periodId continuam funcionando
    getContractsForPeriod(_periodId) {
        return this.getAllContracts();
    }

    getAllContractsEver() {
        return storage.getContracts();
    }

    getContractById(id)  { return storage.getContractById(id); }
    getContract(id)      { return this.getContractById(id); }

    createContract(contractData) {
        if (!contractData.client || contractData.value === undefined || contractData.value === null || contractData.value === '' || isNaN(parseFloat(contractData.value))) {
            throw new Error('Cliente e valor são obrigatórios (valor pode ser 0, para parcerias)');
        }

        const contract = {
            client:            contractData.client,
            value:             parseFloat(contractData.value),
            videoCount:        parseInt(contractData.videoCount)  || 0,
            staticCount:       parseInt(contractData.staticCount) || 0,
            trafficManagement: !!contractData.trafficManagement,
            founderBrand:      !!contractData.founderBrand,
            peopleAllocations: contractData.peopleAllocations || [],
            squadTag:          contractData.squadTag || null,
            notes:             contractData.notes || '',
            active:            true,
        };

        return storage.addContract(contract);
    }

    updateContract(id, updates) {
        if (!storage.getContractById(id)) throw new Error('Contrato não encontrado');
        if (updates.value        !== undefined) updates.value        = parseFloat(updates.value)      || 0;
        if (updates.videoCount   !== undefined) updates.videoCount   = parseInt(updates.videoCount)   || 0;
        if (updates.staticCount  !== undefined) updates.staticCount  = parseInt(updates.staticCount)  || 0;
        if (updates.trafficManagement !== undefined) updates.trafficManagement = !!updates.trafficManagement;
        if (updates.founderBrand !== undefined) updates.founderBrand = !!updates.founderBrand;
        return storage.updateContract(id, updates);
    }

    deleteContract(id) { return storage.deleteContract(id); }

    searchContracts(query) {
        const q = query.toLowerCase();
        return this.getAllContracts().filter(c =>
            c.client.toLowerCase().includes(q) ||
            (c.notes && c.notes.toLowerCase().includes(q))
        );
    }

    getContractsBySquad(squadId) {
        return storage.getContracts().filter(c => c.squadTag === squadId);
    }

    getContractsByPerson(personId) {
        return storage.getContracts().filter(c =>
            (c.peopleAllocations || []).some(a => a.personId === personId)
        );
    }

    setPersonAllocation(contractId, personId, mode, fixedValue = 0) {
        const contract = storage.getContractById(contractId);
        if (!contract) throw new Error('Contrato não encontrado');
        const allocs = [...(contract.peopleAllocations || [])];
        const idx = allocs.findIndex(a => a.personId === personId);
        const entry = { personId, mode, fixedValue: mode === 'fixo' ? (parseFloat(fixedValue) || 0) : 0 };
        if (idx >= 0) allocs[idx] = entry; else allocs.push(entry);
        return this.updateContract(contractId, { peopleAllocations: allocs });
    }

    removePersonAllocation(contractId, personId) {
        const contract = storage.getContractById(contractId);
        if (!contract) throw new Error('Contrato não encontrado');
        const allocs = (contract.peopleAllocations || []).filter(a => a.personId !== personId);
        return this.updateContract(contractId, { peopleAllocations: allocs });
    }

    assignSquad(contractId, squadId) {
        if (!storage.getSquadById(squadId)) throw new Error('Squad não encontrado');
        return storage.updateContract(contractId, { squadTag: squadId });
    }

    getTotalRevenue()  { return this.getAllContracts().reduce((t, c) => t + (c.value || 0), 0); }
    getContractCount() { return this.getAllContracts().length; }
}

export default new ContractService();
