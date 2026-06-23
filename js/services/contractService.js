// contractService.js - v3: vídeo/estático + peopleAllocations (rateado|fixo)

import storage from '../store/storage.js';

class ContractService {

    getAllContracts() {
        const currentPeriod = storage.getCurrentPeriod();
        return storage.getActiveContractsForPeriod(currentPeriod);
    }

    getContractsForPeriod(periodId) {
        return storage.getActiveContractsForPeriod(periodId);
    }

    getAllContractsEver() {
        return storage.getContracts();
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
            videoCount:         parseInt(contractData.videoCount) || 0,
            staticCount:        parseInt(contractData.staticCount) || 0,
            trafficManagement:  !!contractData.trafficManagement,
            peopleAllocations:  contractData.peopleAllocations || [],
            squadTag:           contractData.squadTag || null,
            notes:              contractData.notes || '',
            confirmedPeriods:   [],
        };

        const saved = storage.addContract(contract);
        storage.confirmContractPeriod(saved.id, contractData.confirmPeriod || currentPeriod);
        return storage.getContractById(saved.id);
    }

    updateContract(id, updates) {
        const contract = storage.getContractById(id);
        if (!contract) throw new Error('Contrato não encontrado');

        if (updates.value !== undefined)        updates.value        = parseFloat(updates.value) || 0;
        if (updates.videoCount !== undefined)   updates.videoCount   = parseInt(updates.videoCount)  || 0;
        if (updates.staticCount !== undefined)  updates.staticCount  = parseInt(updates.staticCount) || 0;
        if (updates.trafficManagement !== undefined) updates.trafficManagement = !!updates.trafficManagement;

        return storage.updateContract(id, updates);
    }

    deleteContract(id) {
        return storage.deleteContract(id);
    }

    // ─── Confirmação mensal ────────────────────────────────────────────────

    confirmPeriod(contractId, periodId) {
        return storage.confirmContractPeriod(contractId, periodId);
    }

    unconfirmPeriod(contractId, periodId) {
        return storage.unconfirmContractPeriod(contractId, periodId);
    }

    getConfirmedPeriods(contractId) {
        const contract = storage.getContractById(contractId);
        return contract ? [...(contract.confirmedPeriods || [])].sort() : [];
    }

    getLastConfirmedPeriod(contractId) {
        const periods = this.getConfirmedPeriods(contractId);
        return periods.length > 0 ? periods[periods.length - 1] : null;
    }

    /**
     * Um contrato fica travado para edição direta (valor, entregáveis, squad,
     * equipe, tráfego) quando já tem algum mês confirmado além do mês atual —
     * ou seja, já tem histórico real que seria corrompido por uma edição
     * retroativa. Cliente e busca/duplicar não entram nessa regra.
     */
    isLockedByHistory(contractId, referencePeriodId = null) {
        const currentPeriod = referencePeriodId || storage.getCurrentPeriod();
        const periods = this.getConfirmedPeriods(contractId);
        return periods.some(p => p !== currentPeriod);
    }

    /**
     * "Lançar novo contrato a partir deste": fecha o contrato original no mês
     * atual (deixa de confirmar daqui pra frente) e cria um contrato novo, com
     * histórico zerado, já confirmado no mês atual — preservando o histórico
     * anterior intacto no contrato antigo.
     */
    duplicateContract(id, overrides = {}) {
        const original = storage.getContractById(id);
        if (!original) throw new Error('Contrato não encontrado');

        const currentPeriod = storage.getCurrentPeriod();

        const newContractData = {
            client:             overrides.client ?? original.client,
            value:              overrides.value ?? original.value,
            videoCount:         overrides.videoCount ?? original.videoCount ?? 0,
            staticCount:        overrides.staticCount ?? original.staticCount ?? 0,
            trafficManagement:  overrides.trafficManagement ?? original.trafficManagement ?? false,
            peopleAllocations:  (overrides.peopleAllocations ?? original.peopleAllocations ?? []).map(a => ({ ...a })),
            squadTag:           overrides.squadTag ?? original.squadTag ?? null,
            notes:              original.notes ?? '',
        };

        const created = this.createContract(newContractData);
        storage.unconfirmContractPeriod(original.id, currentPeriod);
        return created;
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
