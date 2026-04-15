// dashboardPage.js - Main dashboard page

import analyticsService from '../services/analyticsService.js';
import contractService from '../services/contractService.js';
import personService from '../services/personService.js';
import squadService from '../services/squadService.js';
import insightsService from '../services/insightsService.js';
import { loadDemoData } from '../utils/demoData.js';
import storage from '../store/storage.js';

export function renderDashboard() {
    const contentEl = document.getElementById('content');
    
    // Get analytics data
    const overallROI = analyticsService.getOverallROI();
    const squadComparison = analyticsService.getSquadComparison();
    const productivityRanking = analyticsService.getProductivityRanking();
    const contractRanking = analyticsService.getContractProfitabilityRanking();
    const deliverablesBreakdown = analyticsService.getDeliverablesBreakdown();
    const insights = insightsService.generateAllInsights();
    const opportunities = insightsService.getTopOpportunities();

    contentEl.innerHTML = `
        <div class="page-header flex-between">
            <div>
                <h1 class="page-title">Dashboard</h1>
                <p class="page-subtitle">Visão geral da performance da agência</p>
            </div>
            <div>
                <button class="btn btn-secondary" onclick="window.loadDemo()">
                    🎯 Carregar Dados Demo
                </button>
            </div>
        </div>

        <!-- Insights and Alerts -->
        ${renderInsights(insights, opportunities)}

        <!-- Overall Stats -->
        <div class="dashboard-grid">
            ${renderOverallStats(overallROI)}
        </div>

        <!-- Squads Performance -->
        ${renderSquadsPerformance(squadComparison)}

        <!-- Productivity Ranking -->
        ${renderProductivityRanking(productivityRanking)}

        <!-- Contract Profitability -->
        ${renderContractProfitability(contractRanking)}

        <!-- Deliverables Breakdown -->
        ${renderDeliverablesBreakdown(deliverablesBreakdown)}
    `;

    // Attach handlers
    window.loadDemo = loadDemoHandler;
}

function loadDemoHandler() {
    if (confirm('Isso vai substituir todos os dados atuais por dados de demonstração. Continuar?')) {
        const result = loadDemoData(storage);
        alert(`Dados demo carregados!\n\n${result.peopleCount} pessoas\n${result.squadsCount} squads\n${result.contractsCount} contratos`);
        renderDashboard();
    }
}

function renderInsights(insights, opportunities) {
    if (insights.length === 0 && opportunities.length === 0) {
        return '';
    }

    const criticalInsights = insights.filter(i => i.type === 'critical');
    const warningInsights = insights.filter(i => i.type === 'warning');
    const infoInsights = insights.filter(i => i.type === 'info');

    return `
        <div class="grid grid-2" style="margin-bottom: 2rem;">
            <!-- Alerts -->
            ${criticalInsights.length > 0 || warningInsights.length > 0 ? `
                <div class="widget">
                    <div class="widget-header">
                        <h2 class="widget-title">⚠️ Alertas</h2>
                    </div>
                    <div class="widget-body">
                        ${[...criticalInsights, ...warningInsights].slice(0, 5).map(insight => `
                            <div style="padding: 1rem; background: ${
                                insight.type === 'critical' ? 'rgba(255, 51, 51, 0.1)' : 'rgba(255, 170, 0, 0.1)'
                            }; border-left: 3px solid ${
                                insight.type === 'critical' ? 'var(--error)' : 'var(--warning)'
                            }; border-radius: 4px; margin-bottom: 1rem;">
                                <div style="font-weight: 600; margin-bottom: 0.5rem;">${insight.title}</div>
                                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">${insight.message}</div>
                                <div style="color: var(--text-secondary); font-size: 0.85rem; font-style: italic;">→ ${insight.action}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Opportunities -->
            ${opportunities.length > 0 ? `
                <div class="widget">
                    <div class="widget-header">
                        <h2 class="widget-title">✨ Oportunidades</h2>
                    </div>
                    <div class="widget-body">
                        ${opportunities.map(opp => `
                            <div style="padding: 1rem; background: rgba(0, 255, 65, 0.1); border-left: 3px solid var(--success); border-radius: 4px; margin-bottom: 1rem;">
                                <div style="font-weight: 600; margin-bottom: 0.5rem;">${opp.title}</div>
                                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">${opp.message}</div>
                                ${opp.items ? `
                                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-secondary); font-size: 0.85rem;">
                                        ${opp.items.map(item => `<li>${item}</li>`).join('')}
                                    </ul>
                                ` : ''}
                                <div style="color: var(--text-secondary); font-size: 0.85rem; font-style: italic;">→ ${opp.action}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderOverallStats(roi) {
    const marginClass = roi.margin > 30 ? 'positive' : roi.margin > 0 ? '' : 'negative';
    const profitClass = roi.profit > 0 ? 'positive' : 'negative';

    return `
        <div class="stat-card">
            <div class="stat-value">R$ ${formatCurrency(roi.revenue)}</div>
            <div class="stat-label">Receita Total</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">R$ ${formatCurrency(roi.cost)}</div>
            <div class="stat-label">Custo Total</div>
        </div>
        <div class="stat-card ${profitClass}">
            <div class="stat-value">R$ ${formatCurrency(roi.profit)}</div>
            <div class="stat-label">Lucro</div>
        </div>
        <div class="stat-card ${marginClass}">
            <div class="stat-value">${roi.margin.toFixed(1)}%</div>
            <div class="stat-label">Margem</div>
        </div>
    `;
}

function renderSquadsPerformance(squads) {
    if (squads.length === 0) {
        return `
            <div class="widget">
                <div class="widget-header">
                    <h2 class="widget-title">Performance dos Squads</h2>
                </div>
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <p>Nenhum squad cadastrado ainda</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="widget">
            <div class="widget-header">
                <h2 class="widget-title">Performance dos Squads</h2>
            </div>
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
                                    <td>${squad.margin.toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderProductivityRanking(ranking) {
    if (ranking.length === 0) {
        return `
            <div class="widget">
                <div class="widget-header">
                    <h2 class="widget-title">Ranking de Produtividade</h2>
                </div>
                <div class="empty-state">
                    <div class="empty-state-icon">🏆</div>
                    <p>Nenhuma pessoa cadastrada ainda</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="widget">
            <div class="widget-header">
                <h2 class="widget-title">Ranking de Produtividade</h2>
            </div>
            <div class="widget-body">
                <ul class="ranking-list">
                    ${ranking.slice(0, 10).map((person, index) => `
                        <li class="ranking-item">
                            <div class="ranking-position">${index + 1}</div>
                            <div class="ranking-info">
                                <div class="ranking-name">${person.name}</div>
                                <div class="ranking-meta">${person.role} • ${person.totalDeliverables} entregas • ${person.contractCount} contratos</div>
                            </div>
                            <div class="ranking-value">
                                ${person.costPerDeliverable > 0 ? `R$ ${formatCurrency(person.costPerDeliverable)}/entrega` : 'N/A'}
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
}

function renderContractProfitability(contracts) {
    if (contracts.length === 0) {
        return `
            <div class="widget">
                <div class="widget-header">
                    <h2 class="widget-title">Contratos Mais Lucrativos</h2>
                </div>
                <div class="empty-state">
                    <div class="empty-state-icon">💰</div>
                    <p>Nenhum contrato cadastrado ainda</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="widget">
            <div class="widget-header">
                <h2 class="widget-title">Contratos Mais Lucrativos</h2>
            </div>
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
                                    <td>R$ ${formatCurrency(contract.value)}</td>
                                    <td>R$ ${formatCurrency(contract.cost)}</td>
                                    <td>
                                        <span class="badge ${contract.profit > 0 ? 'badge-success' : 'badge-error'}">
                                            R$ ${formatCurrency(contract.profit)}
                                        </span>
                                    </td>
                                    <td>${contract.margin.toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderDeliverablesBreakdown(breakdown) {
    if (breakdown.length === 0) {
        return '';
    }

    const total = breakdown.reduce((sum, item) => sum + item.total, 0);

    return `
        <div class="widget">
            <div class="widget-header">
                <h2 class="widget-title">Distribuição de Entregáveis</h2>
            </div>
            <div class="widget-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Quantidade</th>
                                <th>Contratos</th>
                                <th>% do Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${breakdown.map(item => `
                                <tr>
                                    <td><strong>${item.type}</strong></td>
                                    <td>${item.total}</td>
                                    <td>${item.contracts}</td>
                                    <td>${((item.total / total) * 100).toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
