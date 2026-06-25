// dashboardPage.js - Main dashboard page

import analyticsService from '../services/analyticsService.js';
import contractService from '../services/contractService.js';
import insightsService from '../services/insightsService.js';
import storage from '../store/storage.js';
import { renderPeriodSelector } from '../components/periodSelector.js';

export function renderDashboard() {
    const contentEl = document.getElementById('content');
    const currentPeriod = storage.getCurrentPeriod();

    const overallROI          = analyticsService.getOverallROI(currentPeriod);
    const squadComparison     = analyticsService.getSquadComparison(currentPeriod);
    const productivityRanking = analyticsService.getProductivityRanking(currentPeriod);
    const engagementRanking   = analyticsService.getEngagementProfitabilityRanking(currentPeriod);
    const insights            = insightsService.generateAllInsights();
    const opportunities       = insightsService.getTopOpportunities();

    const recurringRevenue = contractService.getAllContracts()
        .reduce((s, c) => s + analyticsService.getContractROI(c.id, currentPeriod).revenue, 0);
    const oneOffRevenue = overallROI.revenue - recurringRevenue;

    const salaryDivergences = analyticsService.getSalaryReconciliation(currentPeriod).filter(r => !r.isOk);
    const founderBrand       = analyticsService.getFounderBrandSummary(currentPeriod);

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

        ${renderRevenueSplit(recurringRevenue, oneOffRevenue)}
        ${renderAttentionPanel(salaryDivergences, founderBrand)}
        ${renderSquadsPerformance(squadComparison)}
        ${renderEngagementProfitability(engagementRanking)}
        ${renderProductivityRanking(productivityRanking)}
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

// ─── Recorrência vs. Pontual ───────────────────────────────────────────────────

function renderRevenueSplit(recurringRevenue, oneOffRevenue) {
    const total = recurringRevenue + oneOffRevenue;
    const recurringPct = total > 0 ? (recurringRevenue / total) * 100 : 0;

    return `
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin:1.5rem 0;">
            <div class="stat-card">
                <div class="stat-value">R$ ${formatCurrency(recurringRevenue)}</div>
                <div class="stat-label">Receita Recorrência</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">R$ ${formatCurrency(oneOffRevenue)}</div>
                <div class="stat-label">🚀 Receita Projetos Pontuais</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${recurringPct.toFixed(0)}% / ${(100 - recurringPct).toFixed(0)}%</div>
                <div class="stat-label">Mix Recorrência / Pontual</div>
            </div>
        </div>
    `;
}

// ─── Pontos de Atenção ─────────────────────────────────────────────────────────

function renderAttentionPanel(salaryDivergences, founderBrand) {
    const hasDivergences = salaryDivergences.length > 0;
    const hasFounderBrand = founderBrand.clientCount > 0;

    if (!hasDivergences && !hasFounderBrand) return '';

    return `
        <div class="grid grid-2" style="margin-bottom: 1.5rem;">
            ${hasDivergences ? `
                <div class="widget">
                    <div class="widget-header"><h2 class="widget-title">⚠️ Conferência Salarial</h2></div>
                    <div class="widget-body">
                        <p style="margin-bottom: 0.75rem;">
                            <strong style="color: var(--error,#f44336); font-size: 1.3rem;">${salaryDivergences.length}</strong>
                            pessoa${salaryDivergences.length !== 1 ? 's' : ''} com divergência entre salário e alocação.
                        </p>
                        <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.85rem; color: var(--text-secondary);">
                            ${salaryDivergences.slice(0, 5).map(r => `
                                <li>${r.name} — ${r.diff > 0 ? `faltam R$ ${formatCurrency(r.diff)}` : `R$ ${formatCurrency(Math.abs(r.diff))} acima`}</li>
                            `).join('')}
                        </ul>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); font-style: italic; margin-top: 0.5rem;">💡 Ver detalhes em Conferência Salarial</div>
                    </div>
                </div>
            ` : ''}

            ${hasFounderBrand ? `
                <div class="widget">
                    <div class="widget-header"><h2 class="widget-title">🎤 Founder Brand</h2></div>
                    <div class="widget-body">
                        <div style="display:flex; gap:2rem;">
                            <div>
                                <div class="stat-value" style="font-size:1.6rem;">${founderBrand.clientCount}</div>
                                <div class="stat-label">cliente${founderBrand.clientCount !== 1 ? 's' : ''}</div>
                            </div>
                            <div>
                                <div class="stat-value" style="font-size:1.6rem;">R$ ${formatCurrency(founderBrand.revenue)}</div>
                                <div class="stat-label">receita</div>
                            </div>
                            <div>
                                <div class="stat-value" style="font-size:1.6rem; color:var(--text-secondary);">R$ ${formatCurrency(founderBrand.reserveTotal)}</div>
                                <div class="stat-label">salário reservado</div>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
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
                                <th>Clientes</th>
                                <th>Receita</th>
                                <th>Custo</th>
                                <th>Lucro</th>
                                <th>Margem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${squads.map(squad => {
                                const clientCount = (squad.contractCount || 0) + (squad.projectCount || 0);
                                return `
                                <tr>
                                    <td><strong>${squad.name}</strong></td>
                                    <td>${squad.memberCount}</td>
                                    <td>${clientCount}${squad.projectCount > 0 ? ` <span style="color:var(--text-secondary); font-size:0.78rem;">(${squad.contractCount} + ${squad.projectCount} 🚀)</span>` : ''}</td>
                                    <td>R$ ${formatCurrency(squad.revenue)}</td>
                                    <td>R$ ${formatCurrency(squad.cost)}</td>
                                    <td>
                                        <span class="badge ${squad.profit > 0 ? 'badge-success' : 'badge-error'}">
                                            R$ ${formatCurrency(squad.profit)}
                                        </span>
                                    </td>
                                    <td>${safeFixed(squad.margin)}%</td>
                                </tr>
                            `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ─── Lucratividade (recorrência + pontual) ─────────────────────────────────────

function renderEngagementProfitability(ranking) {
    if (ranking.length === 0) {
        return `
            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">Lucratividade por Cliente</h2></div>
                <div class="empty-state">
                    <div class="empty-state-icon">💰</div>
                    <p>Nenhum contrato ou projeto cadastrado ainda</p>
                </div>
            </div>
        `;
    }

    const top    = ranking.slice(0, 5);
    const bottom = [...ranking].sort((a, b) => a.profit - b.profit).slice(0, 5);

    const renderRows = (rows) => rows.map(r => `
        <tr>
            <td><strong>${r.client}</strong> ${r.type === 'pontual' ? '<span style="font-size:0.7rem; color:#ff9800;">🚀</span>' : ''}</td>
            <td>R$ ${formatCurrency(r.revenue)}</td>
            <td>R$ ${formatCurrency(r.cost)}</td>
            <td><span class="badge ${r.profit > 0 ? 'badge-success' : 'badge-error'}">R$ ${formatCurrency(r.profit)}</span></td>
            <td>${safeFixed(r.margin)}%</td>
        </tr>
    `).join('');

    return `
        <div class="grid grid-2">
            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">📈 Mais Lucrativos</h2></div>
                <div class="widget-body">
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Cliente</th><th>Receita</th><th>Custo</th><th>Lucro</th><th>Margem</th></tr></thead>
                            <tbody>${renderRows(top)}</tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">📉 Menos Lucrativos</h2></div>
                <div class="widget-body">
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Cliente</th><th>Receita</th><th>Custo</th><th>Lucro</th><th>Margem</th></tr></thead>
                            <tbody>${renderRows(bottom)}</tbody>
                        </table>
                    </div>
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

    const sorted = [...ranking].sort((a, b) => (a.costPerDeliverable || Infinity) - (b.costPerDeliverable || Infinity));

    const kindLabel = (kind) => kind === 'head' ? 'clientes' : kind === 'traffic' ? 'contratos tráfego' : 'entregas';

    return `
        <div class="widget">
            <div class="widget-header"><h2 class="widget-title">Ranking de Produtividade</h2></div>
            <div class="widget-body">
                <ul class="ranking-list">
                    ${sorted.slice(0, 10).map((person, index) => `
                        <li class="ranking-item">
                            <div class="ranking-position">${index + 1}</div>
                            <div class="ranking-info">
                                <div class="ranking-name">${person.name}</div>
                                <div class="ranking-meta">
                                    ${person.role} •
                                    ${person.totalDeliverables} ${kindLabel(person.deliveryKind)} •
                                    ${person.contractCount} contrato${person.contractCount !== 1 ? 's' : ''}
                                </div>
                            </div>
                            <div class="ranking-value">
                                ${person.costPerDeliverable > 0
                                    ? `R$ ${formatCurrency(person.costPerDeliverable)}/${person.deliveryKind === 'head' ? 'cliente' : 'entrega'}`
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

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Formata número como moeda pt-BR. Retorna '0,00' se o valor não for número.
 */
function formatCurrency(value) {
    const num = Number(value);
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * toFixed seguro — retorna '0.0' se o valor não for um número válido.
 */
function safeFixed(value, digits = 1) {
    const num = Number(value);
    return isNaN(num) ? (0).toFixed(digits) : num.toFixed(digits);
}
