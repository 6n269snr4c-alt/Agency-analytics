// contractService.js - REESCRITO para sistema mensal com monthlyProjections

import storage from '../store/storage.js';

class ContractService {

    // ── Retorna contratos ativos no período atual ──────────────────────────────
    getAllContracts() {
        const currentPeriod = storage.getCurrentPeriod();
        return storage.getActiveContractsForPeriod(currentPeriod);
    }

    // ── Busca um contrato pelo id (no array global, não por período) ──────────
    getContractById(id) {
        return storage.getContractById(id);
    }

    getContract(id) {
        return this.getContractById(id);
    }

    // ── Cria contrato e gera projeções mensais ────────────────────────────────
    createContract(contractData) {
        if (!contractData.client || !contractData.value) {
            throw new Error('Cliente e valor são obrigatórios');
        }

        const currentPeriod = storage.getCurrentPeriod();

        const contract = {
            client:           contractData.client,
            value:            parseFloat(contractData.value),
            baseValue:        parseFloat(contractData.baseValue || contractData.value),
            deliverables:     contractData.deliverables     || {},
            baseDeliverables: contractData.baseDeliverables || contractData.deliverables || {},
            duration:         contractData.duration         || 12,
            startPeriod:      contractData.startPeriod      || currentPeriod,
            status:           contractData.status           || 'active',
            squadTag:         contractData.squadTag         || null,
            assignedPeople:   contractData.assignedPeople   || [],
            notes:            contractData.notes            || '',
        };

        const saved = storage.addContract(contract);
        storage.generateContractProjections(saved.id);
        return saved;
    }

    // ── Atualiza contrato e regenera projeções ────────────────────────────────
    updateContract(id, updates) {
        const contract = storage.getContractById(id);
        if (!contract) throw new Error('Contrato não encontrado');

        if (updates.value !== undefined) {
            updates.value     = parseFloat(updates.value);
            updates.baseValue = parseFloat(updates.baseValue || updates.value);
        }

        // Garantir status
        if (!updates.status) updates.status = contract.status || 'active';

        const updated = storage.updateContract(id, updates);

        // Regenerar projeções se valor, entregáveis, duração ou início mudaram
        const needsRegen = ['value', 'baseValue', 'deliverables', 'baseDeliverables', 'duration', 'startPeriod']
            .some(k => updates[k] !== undefined);

        if (needsRegen) {
            storage.generateContractProjections(id);
        }

        return updated;
    }

    // ── Exclui contrato ───────────────────────────────────────────────────────
    deleteContract(id) {
        return storage.deleteContract(id);
    }

    // ── Busca textual ─────────────────────────────────────────────────────────
    searchContracts(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAllContracts().filter(contract =>
            contract.client.toLowerCase().includes(lowerQuery) ||
            (contract.notes && contract.notes.toLowerCase().includes(lowerQuery))
        );
    }

    // ── Por squad / pessoa (usa array global para não depender de período) ────
    getContractsBySquad(squadId) {
        return storage.getContracts().filter(c => c.squadTag === squadId);
    }

    getContractsByPerson(personId) {
        return storage.getContracts().filter(contract =>
            contract.assignedPeople && contract.assignedPeople.includes(personId)
        );
    }

    // ── Entregáveis ───────────────────────────────────────────────────────────
    addDeliverable(contractId, type, quantity) {
        const contract = storage.getContractById(contractId);
        if (!contract) throw new Error('Contrato não encontrado');

        const deliverables = { ...(contract.deliverables || {}), [type]: parseInt(quantity) };
        return this.updateContract(contractId, { deliverables, baseDeliverables: deliverables });
    }

    removeDeliverable(contractId, type) {
        const contract = storage.getContractById(contractId);
        if (!contract) throw new Error('Contrato não encontrado');

        const deliverables = { ...(contract.deliverables || {}) };
        delete deliverables[type];
        return this.updateContract(contractId, { deliverables, baseDeliverables: deliverables });
    }

    // ── Atribuições ───────────────────────────────────────────────────────────
    assignSquad(contractId, squadId) {
        const squad = storage.getSquadById(squadId);
        if (!squad) throw new Error('Squad não encontrado');
        return storage.updateContract(contractId, { squadTag: squadId, assignedPeople: [] });
    }

    assignPeople(contractId, personIds) {
        const people  = storage.getPeople();
        const validIds = personIds.filter(id => people.some(p => p.id === id));
        return storage.updateContract(contractId, { assignedPeople: validIds, squadTag: null });
    }

    // ── Totais ────────────────────────────────────────────────────────────────
    getTotalRevenue() {
        return this.getAllContracts().reduce((total, c) => total + (c.value || 0), 0);
    }

    getContractCount() {
        return this.getAllContracts().length;
    }
}

export default new ContractService();
