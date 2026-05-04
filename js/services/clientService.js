// clientService.js - Visão consolidada por cliente
// Une contratos recorrentes + projetos pontuais pelo nome do cliente (case-insensitive).
// Clientes só de projetos pontuais também aparecem.

import storage from '../store/storage.js';
import analyticsService from './analyticsService.js';
import projectService from './projectService.js';

class ClientService {

    // ─── Normalização de nome ─────────────────────────────────────────────────

    _key(name) {
        return (name || '').trim().toLowerCase();
    }

    // ─── Lista todos os clientes únicos ───────────────────────────────────────

    /**
     * Retorna array de nomes de clientes únicos (considerando recorrentes + pontuais).
     * Usa o nome "canônico" = primeira ocorrência encontrada (preserva capitalização original).
     */
    getAllClientNames() {
        const seen = new Map(); // key → canonical name

        // Contratos recorrentes (todos, não filtrado por período)
        storage.getContracts().forEach(c => {
            const k = this._key(c.client);
            if (c.client && !seen.has(k)) seen.set(k, c.client.trim());
        });

        // Projetos pontuais
        storage.getProjects().forEach(p => {
            const k = this._key(p.client);
            if (p.client && !seen.has(k)) seen.set(k, p.client.trim());
        });

        return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }

    // ─── Dados consolidados de um cliente num período ─────────────────────────

    /**
     * Retorna o perfil financeiro completo de um cliente para o período dado.
     *
     * Receita recorrente  = soma das projeções dos contratos ativos no período
     * Custo recorrente    = soma dos ROIs calculados pelo analyticsService
     * Receita pontual     = projetos com billingPeriod === periodId
     * Custo externo       = custos externos (freelancers) dos projetos pontuais
     */
    getClientProfile(clientName, periodId) {
        const key = this._key(clientName);

        // ── Contratos recorrentes ativos no período ──
        const activeContracts = storage.getActiveContractsForPeriod(periodId)
            .filter(c => this._key(c.client) === key);

        let recurringRevenue = 0;
        let recurringCost    = 0;

        const contractDetails = activeContracts.map(c => {
            const roi = analyticsService.getContractROI(c.id, periodId);
            recurringRevenue += roi.revenue;
            recurringCost    += roi.cost;
            return {
                id:       c.id,
                name:     c.client,
                squad:    c.squadTag ? storage.getSquadById(c.squadTag) : null,
                revenue:  roi.revenue,
                cost:     roi.cost,
                profit:   roi.profit,
                margin:   roi.margin,
            };
        });

        // ── Projetos pontuais faturando no período ──
        const periodProjects = projectService.getProjectsForPeriod(periodId)
            .filter(p => this._key(p.client) === key);

        let projectRevenue  = 0;
        let projectExtCost  = 0;

        const projectDetails = periodProjects.map(p => {
            projectRevenue += (p.value || 0);
            projectExtCost += (p.externalCost || 0);
            return {
                id:           p.id,
                name:         p.name,
                squad:        p.squadId ? storage.getSquadById(p.squadId) : null,
                revenue:      p.value || 0,
                externalCost: p.externalCost || 0,
                status:       p.status,
            };
        });

        // ── Todos os projetos do cliente (histórico completo, sem filtro de período) ──
        const allProjects = storage.getProjects()
            .filter(p => this._key(p.client) === key && p.status !== 'cancelado');

        // ── Consolidado ──
        const totalRevenue = recurringRevenue + projectRevenue;
        const totalCost    = recurringCost    + projectExtCost;
        const profit       = totalRevenue - totalCost;
        const margin       = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        // ── LTV histórico (todas as projeções de todos os contratos + todos os projetos concluídos) ──
        const ltv = this._calculateLTV(key);

        return {
            clientName:       clientName.trim(),
            periodId,
            // Recorrente
            recurringRevenue,
            recurringCost,
            recurringProfit:  recurringRevenue - recurringCost,
            recurringMargin:  recurringRevenue > 0 ? ((recurringRevenue - recurringCost) / recurringRevenue) * 100 : 0,
            contractDetails,
            // Pontual
            projectRevenue,
            projectExtCost,
            projectProfit:    projectRevenue - projectExtCost,
            projectDetails,
            allProjects,
            // Consolidado
            totalRevenue,
            totalCost,
            profit,
            margin,
            // Meta
            isRecurring: activeContracts.length > 0,
            isPunctual:  periodProjects.length > 0,
            hasHistory:  allProjects.length > 0,
            ltv,
        };
    }

    /**
     * LTV simplificado: soma de todas as projeções confirmadas/projetadas
     * de todos os contratos + todos os projetos pontuais concluídos.
     */
    _calculateLTV(key) {
        let ltv = 0;

        storage.getContracts()
            .filter(c => this._key(c.client) === key && c.status !== 'inactive')
            .forEach(c => {
                (c.monthlyProjections || []).forEach(p => {
                    ltv += (p.value || 0);
                });
            });

        storage.getProjects()
            .filter(p => this._key(p.client) === key && p.status === 'concluido')
            .forEach(p => {
                ltv += (p.value || 0);
            });

        return ltv;
    }

    // ─── Lista completa de perfis para o período ──────────────────────────────

    getAllClientProfiles(periodId) {
        return this.getAllClientNames()
            .map(name => this.getClientProfile(name, periodId))
            .sort((a, b) => b.totalRevenue - a.totalRevenue);
    }

    // ─── Sugestão de clientes para autocomplete ───────────────────────────────

    suggestClients(query) {
        if (!query || query.trim().length < 2) return [];
        const q = this._key(query);
        return this.getAllClientNames().filter(n => this._key(n).includes(q));
    }
}

export default new ClientService();
