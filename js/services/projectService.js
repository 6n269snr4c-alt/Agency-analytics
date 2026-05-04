// projectService.js - Serviço de Projetos Pontuais
// Projetos one-off com receita atribuída a um squad, entregáveis e custos externos

import storage from '../store/storage.js';

class ProjectService {

    // ====================
    // CRUD
    // ====================

    getAllProjects() {
        return storage.getProjects();
    }

    getProjectById(id) {
        return storage.getProjects().find(p => p.id === id) || null;
    }

    createProject(data) {
        this._validate(data);
        const project = {
            name:             data.name.trim(),
            client:           data.client?.trim() || '',
            squadId:          data.squadId || null,
            description:      data.description?.trim() || '',
            value:            Number(data.value) || 0,
            externalCost:     Number(data.externalCost) || 0,
            externalCostNote: data.externalCostNote?.trim() || '',
            // Entregáveis: objeto { deliverableTypeId: qty } OU array de labels livres
            deliverables:     data.deliverables || {},
            customDeliverables: data.customDeliverables || [], // [{ label, qty }]
            startDate:        data.startDate || null,
            deliveryDate:     data.deliveryDate || null,
            // Período em que o faturamento entra na receita (YYYY-MM)
            billingPeriod:    data.billingPeriod || null,
            status:           data.status || 'em_andamento', // em_andamento | concluido | cancelado
            notes:            data.notes?.trim() || '',
        };
        return storage.addProject(project);
    }

    updateProject(id, data) {
        const existing = this.getProjectById(id);
        if (!existing) throw new Error('Projeto não encontrado');
        this._validate(data);
        const updates = {
            name:             data.name.trim(),
            client:           data.client?.trim() || '',
            squadId:          data.squadId || null,
            description:      data.description?.trim() || '',
            value:            Number(data.value) || 0,
            externalCost:     Number(data.externalCost) || 0,
            externalCostNote: data.externalCostNote?.trim() || '',
            deliverables:     data.deliverables || {},
            customDeliverables: data.customDeliverables || [],
            startDate:        data.startDate || null,
            deliveryDate:     data.deliveryDate || null,
            billingPeriod:    data.billingPeriod || null,
            status:           data.status || 'em_andamento',
            notes:            data.notes?.trim() || '',
        };
        return storage.updateProject(id, updates);
    }

    deleteProject(id) {
        return storage.deleteProject(id);
    }

    // ====================
    // ANALYTICS
    // ====================

    /**
     * Retorna projetos que faturam em determinado período (YYYY-MM).
     * Projetos sem billingPeriod são ignorados no contexto mensal.
     */
    getProjectsForPeriod(periodId) {
        return this.getAllProjects().filter(p =>
            p.status !== 'cancelado' && p.billingPeriod === periodId
        );
    }

    /**
     * Receita total de projetos pontuais em um período.
     */
    getTotalRevenueForPeriod(periodId) {
        return this.getProjectsForPeriod(periodId)
            .reduce((sum, p) => sum + (p.value || 0), 0);
    }

    /**
     * Custo externo total de projetos pontuais em um período.
     */
    getTotalExternalCostForPeriod(periodId) {
        return this.getProjectsForPeriod(periodId)
            .reduce((sum, p) => sum + (p.externalCost || 0), 0);
    }

    /**
     * Projetos agrupados por squad.
     */
    getProjectsBySquad(squadId) {
        return this.getAllProjects().filter(p => p.squadId === squadId);
    }

    /**
     * Resumo financeiro de todos os projetos pontuais de um período,
     * agrupados por squad — para injetar no DRE.
     */
    getSquadProjectSummaryForPeriod(squadId, periodId) {
        const projects = this.getProjectsForPeriod(periodId)
            .filter(p => p.squadId === squadId);
        const revenue      = projects.reduce((s, p) => s + (p.value       || 0), 0);
        const externalCost = projects.reduce((s, p) => s + (p.externalCost || 0), 0);
        return { projects, revenue, externalCost, count: projects.length };
    }

    // ====================
    // VALIDAÇÃO
    // ====================

    _validate(data) {
        if (!data.name || !data.name.trim()) throw new Error('Nome do projeto é obrigatório');
        if (!data.value || Number(data.value) <= 0) throw new Error('Valor do projeto deve ser maior que zero');
    }
}

export default new ProjectService();
