// dashboardPage.js - Main dashboard page

import analyticsService from '../services/analyticsService.js';
import contractService from '../services/contractService.js';
import personService from '../services/personService.js';
import squadService from '../services/squadService.js';
import insightsService from '../services/insightsService.js';
import { renderPeriodSelector } from '../components/periodSelector.js';

export function renderDashboard() {
    const contentEl = document.getElementById('content');

    const overallROI          = analyticsService.getOverallROI();
    const squadComparison     = analyticsService.getSquadComparison();
    const productivityRanking = analyticsService.getProductivityRanking();
    const contractRanking     = analyticsService.getContractProfitabilityRanking();
    const deliverablesBreakdown = analyticsService.getDeliverablesBreakdown();
    const insights            = insightsService.generateAllInsights();
    const opportunities       = insightsService.getTopOpportunities();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Dashboard</h1>
            <p class="page-subtitle">Visão geral da performance da agência</p>
        </div>

        ${renderPeriodSelector()}
        ${renderInsights(insights, opportunities)}

        <div class="dashboard-grid">
            ${renderOverallStats(overallROI)}
        </div>

        ${renderSquadsPerformance(squadComparison)}
        ${renderProductivityRanking(productivityRanking)}
        ${renderContractProfitability(contractRanking)}
        ${renderDeliverablesBreakdown(deliverablesBreakdown)}
    `;
}

// ─── Insights & Alertas ───────────────────────────────────────────────────────

function renderInsights(insights, opportunities) {
    if (insights.length === 0 && opportunities.length === 0) return '';

    const criticalInsights = insights.filter(i => i.type === 'critical');
    const warningInsights  = insights.filter(i => i.type === 'warning');
    const infoInsights     = insights.filter(i => i.type === 'info');

    return `
        <div class="grid grid-2" style="margin-bottom: 2rem;">
            ${(criticalInsights.length > 0 || warningInsights.length > 0) ? `
                <div class="widget">
                    <div class="widget-header">
                        <h2 class="widget-title">⚠️ Alertas</h2>
                    </div>
                    <div class="widget-body">
                        ${[...criticalInsights, ...warningInsights].slice(0, 5).map(insight => `
                            <div style="padding: 1rem; background: ${insight.type === 'critical' ? 'rgba(220,53,69,0.1)' : 'rgba(255,193,7,0.1)'}; border-left: 3px solid ${insight.type === 'critical' ? 'var(--error)' : 'var(--warning)'}; border-radius: 4px; margin-bottom: 0.75rem;">
                                <div style="font-weight: 600; color: ${insight.type === 'critical' ? 'var(--error)' : 'var(--warning)'}; margin-bottom: 0.25rem;">
                                    ${insight.title}
                                </div>
                                <div style="font-size: 0.9rem; color: var(--text-secondary);">${insight.message}</div>
                                ${insight.action ? `<div style="font-size: 0.8rem; color: var(--text-secondary); font-style: italic; margin-top: 0.25rem;">💡 ${insight.action}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${infoInsights.length > 0 ? `
                <div class="widget">
                    <div class="widget-header">
                        <h2 class="widget-title">ℹ️ Informações</h2>
                    </div>
                    <div class="widget-body">
                        ${infoInsights.slice(0, 5).map(insight => `
                            <div style="padding: 1rem; background: rgba(13,202,240,0.1); border-left: 3px solid #0dcaf0; border-radius: 4px; margin-bottom: 0.75rem;">
                                <div style="font-weight: 600; color: #0dcaf0; margin-bottom: 0.25rem;">${insight.title}</div>
                                <div style="font-size: 0.9rem; color: var(--text-secondary);">${insight.message}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${opportunities.length > 0 ? `
                <div class="widget">
                    <div class="widget-header">
                        <h2 class="widget-title">🚀 Oportunidades</h2>
                    </div>
                    <div class="widget-body">
                        ${opportunities.slice(0, 3).map(opp => `
                            <div style="padding: 1rem; background: rgba(25,135,84,0.1); border-left: 3px solid var(--success); border-radius: 4px; margin-bottom: 0.75rem;">
                                <div style="font-weight: 600; color: var(--success); margin-bottom: 0.25rem;">${opp.title}</div>
                                <div style="font-size: 0.9rem; color: var(--text-secondary);">${opp.message}</div>
                                ${opp.items && opp.items.length > 0 ? `
                                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.85rem;">
                                        ${opp.items.map(item => `<li>${item}</li>`).join('')}
                                    </ul>
                                ` : ''}
                                ${opp.action ? `<div style="font-size: 0.8rem; color: var(--text-secondary); font-style: italic;">💡 ${opp.action}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// ─── Stats gerais ─────────────────────────────────────────────────────────────

function renderOverallStats(roi) {
    const marginClass = roi.margin > 30 ? 'positive' : roi.margin > 0 ? '' : 'negative';
    const profitClass = roi.profit > 0 ? 'positive' : 'negative';

    return `
        <div style="display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 1.5rem; align-items: center;">
            <div class="stat-card">
                <div class="stat-value">R$ ${formatCurrency(roi.revenue)}</div>
                <div class="stat-label">Receita Total</div>
            </div>
            <div style="font-size: 3rem; font-weight: bold; color: var(--text-secondary);">−</div>
            <div class="stat-card">
                <div class="stat-value">R$ ${formatCurrency(roi.cost)}</div>
                <div class="stat-label">Custo Total</div>
            </div>
            <div style="font-size: 3rem; font-weight: bold; color: var(--text-secondary);">=</div>
            <div class="stat-card ${profitClass}">
                <div class="stat-value">R$ ${formatCurrency(roi.profit)}</div>
                <div class="stat-label">Lucro</div>
                <div class="stat-label" style="margin-top: 0.25rem; font-size: 0.9rem;">
                    <span class="badge ${marginClass === 'positive' ? 'badge-success' : marginClass === 'negative' ? 'badge-error' : 'badge-warning'}" style="font-size: 1rem; padding: 0.5rem 1rem;">
                        ${roi.margin.toFixed(1)}% margem
                    </span>
                </div>
            </div>
        </div>
    `;
}

// ─── Performance dos Squads ───────────────────────────────────────────────────

function renderSquadsPerformance(squads) {
    if (squads.length === 0) {
        return `
            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">Performance dos Squads</h2></div>
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <p>Nenhum squad cadastrado ainda</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="widget">
            <div class="widget-header"><h2 class="widget-title">Performance dos Squads</h2></div>
            <div class="widget-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Squad</th>
                                <th>Membros</th>
                                <th>Contratos</th>
                                <th>Receita</th>
                                <th>Custo</th>
                                <th>Lucro</th>
                                <th>Margem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${squads.map(squad => `
                                <tr>
                                    <td><strong>${squad.name}</strong></td>
                                    <td>${squad.memberCount}</td>
                                    <td>${squad.contractCount}</td>
                                    <td>R$ ${formatCurrency(squad.revenue)}</td>
                                    <td>R$ ${formatCurrency(squad.cost)}</td>
                                    <td>
                                        <span class="badge ${squad.profit > 0 ? 'badge-success' : 'badge-error'}">
                                            R$ ${formatCurrency(squad.profit)}
                                        </span>
                                    </td>
                                    <td>${safeFixed(squad.margin)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ─── Ranking de Produtividade ─────────────────────────────────────────────────

function renderProductivityRanking(ranking) {
    if (ranking.length === 0) {
        return `
            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">Ranking de Produtividade</h2></div>
                <div class="empty-state">
                    <div class="empty-state-icon">🏆</div>
                    <p>Nenhuma pessoa cadastrada ainda</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="widget">
            <div class="widget-header"><h2 class="widget-title">Ranking de Produtividade</h2></div>
            <div class="widget-body">
                <ul class="ranking-list">
                    ${ranking.slice(0, 10).map((person, index) => `
                        <li class="ranking-item">
                            <div class="ranking-position">${index + 1}</div>
                            <div class="ranking-info">
                                <div class="ranking-name">${person.name}</div>
                                <div class="ranking-meta">
                                    ${person.role} •
                                    ${person.totalDeliverables ?? person.totalWeightedPoints ?? 0} entregas •
                                    ${person.contractCount} contratos
                                </div>
                            </div>
                            <div class="ranking-value">
                                ${(person.costPerDeliverable ?? person.costPerPoint ?? 0) > 0
                                    ? `R$ ${formatCurrency(person.costPerDeliverable ?? person.costPerPoint)}/entrega`
                                    : 'N/A'
                                }
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
}

// ─── Contratos Mais Lucrativos ────────────────────────────────────────────────

function renderContractProfitability(contracts) {
    if (contracts.length === 0) {
        return `
            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">Contratos Mais Lucrativos</h2></div>
                <div class="empty-state">
                    <div class="empty-state-icon">💰</div>
                    <p>Nenhum contrato cadastrado ainda</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="widget">
            <div class="widget-header"><h2 class="widget-title">Contratos Mais Lucrativos</h2></div>
            <div class="widget-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Receita</th>
                                <th>Custo</th>
                                <th>Lucro</th>
                                <th>Margem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${contracts.slice(0, 10).map(contract => `
                                <tr>
                                    <td><strong>${contract.client}</strong></td>
                                    <td>R$ ${formatCurrency(contract.revenue)}</td>
                                    <td>R$ ${formatCurrency(contract.cost)}</td>
                                    <td>
                                        <span class="badge ${contract.profit > 0 ? 'badge-success' : 'badge-error'}">
                                            R$ ${formatCurrency(contract.profit)}
                                        </span>
                                    </td>
                                    <td>${safeFixed(contract.margin)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ─── Distribuição de Entregáveis ──────────────────────────────────────────────

function renderDeliverablesBreakdown(breakdown) {
    // breakdown pode ser objeto { typeName: qty } ou array
    let entries = [];

    if (Array.isArray(breakdown)) {
        entries = breakdown.map(item => [item.type ?? item.name ?? '?', item.total ?? item.qty ?? 0]);
    } else if (breakdown && typeof breakdown === 'object') {
        entries = Object.entries(breakdown);
    }

    if (entries.length === 0) return '';

    const total = entries.reduce((s, [, qty]) => s + qty, 0);

    return `
        <div class="widget">
            <div class="widget-header"><h2 class="widget-title">Distribuição de Entregáveis</h2></div>
            <div class="widget-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Quantidade</th>
                                <th>% do Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${entries.sort((a, b) => b[1] - a[1]).map(([name, qty]) => `
                                <tr>
                                    <td><strong>${name}</strong></td>
                                    <td>${qty}</td>
                                    <td>${total > 0 ? ((qty / total) * 100).toFixed(1) : '0.0'}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Formata número como moeda pt-BR. Retorna '0,00' se o valor não for número.
 */
function formatCurrency(value) {
    const n = Number(value);
    if (isNaN(n)) return '0,00';
    return n.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * toFixed seguro — retorna '0.0' se o valor não for número.
 */
function safeFixed(value, digits = 1) {
    const n = Number(value);
    if (isNaN(n)) return '0.0';
    return n.toFixed(digits);
}
