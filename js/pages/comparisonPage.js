// comparisonPage.js - Compare professionals by role

import analyticsService from '../services/analyticsService.js';
import personService from '../services/personService.js';

let selectedRole = null;

export function renderComparisonPage() {
    const contentEl = document.getElementById('content');
    const roles = personService.getAllRoles();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Comparação de Profissionais</h1>
            <p class="page-subtitle">Compare produtividade e eficiência por cargo</p>
        </div>

        <div class="action-bar">
            <div class="action-bar-left">
                <label class="form-label" style="margin: 0; margin-right: 1rem;">Comparar:</label>
                <select class="form-select" id="role-selector" style="width: auto; min-width: 200px;" onchange="window.updateComparison()">
                    <option value="">Selecione um cargo</option>
                    ${roles.map(role => `<option value="${role}">${role}</option>`).join('')}
                </select>
            </div>
        </div>

        <div id="comparison-results"></div>
    `;

    attachComparisonHandlers();
}

function attachComparisonHandlers() {
    window.updateComparison = updateComparison;
}

function updateComparison() {
    const roleSelector = document.getElementById('role-selector');
    selectedRole = roleSelector.value;
    
    if (!selectedRole) {
        document.getElementById('comparison-results').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>Selecione um cargo para comparar profissionais</p>
            </div>
        `;
        return;
    }
    
    const comparison = analyticsService.comparePeopleByRole(selectedRole);
    
    if (comparison.length === 0) {
        document.getElementById('comparison-results').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <p>Nenhum profissional encontrado para este cargo</p>
            </div>
        `;
        return;
    }
    
    document.getElementById('comparison-results').innerHTML = renderComparisonResults(comparison);
}

function renderComparisonResults(comparison) {
    if (comparison.length === 1) {
        const person = comparison[0];
        return `
            <div class="widget">
                <div class="widget-header">
                    <h2 class="widget-title">Único profissional no cargo</h2>
                </div>
                <div class="widget-body">
                    ${renderPersonCard(person)}
                </div>
            </div>
        `;
    }

    return `
        <!-- Summary Stats -->
        <div class="dashboard-grid" style="margin-bottom: 2rem;">
            ${renderComparisonStats(comparison)}
        </div>

        <!-- Head to Head Comparisons -->
        ${renderHeadToHead(comparison)}

        <!-- Detailed Table -->
        <div class="widget">
            <div class="widget-header">
                <h2 class="widget-title">Comparação Detalhada</h2>
            </div>
            <div class="widget-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Posição</th>
                                <th>Nome</th>
                                <th>Salário</th>
                                <th>Contratos</th>
                                <th>Entregas</th>
                                <th>Custo/Entrega</th>
                                <th>Ticket Médio</th>
                                <th>Eficiência</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${comparison.map((person, index) => `
                                <tr>
                                    <td><strong>${index + 1}º</strong></td>
                                    <td>${person.name}</td>
                                    <td>R$ ${formatCurrency(person.salary)}</td>
                                    <td>${person.contractCount}</td>
                                    <td>${person.totalDeliverables}</td>
                                    <td>
                                        <span class="badge ${index === 0 ? 'badge-success' : index === comparison.length - 1 ? 'badge-error' : 'badge-warning'}">
                                            R$ ${person.costPerDeliverable > 0 ? formatCurrency(person.costPerDeliverable) : 'N/A'}
                                        </span>
                                    </td>
                                    <td>R$ ${formatCurrency(person.averageTicket)}</td>
                                    <td>${renderEfficiencyBar(person, comparison)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Individual Cards -->
        <div class="grid grid-2" style="margin-top: 2rem;">
            ${comparison.map(person => renderPersonCard(person)).join('')}
        </div>
    `;
}

function renderComparisonStats(comparison) {
    const avgSalary = comparison.reduce((sum, p) => sum + p.salary, 0) / comparison.length;
    const avgDeliverables = comparison.reduce((sum, p) => sum + p.totalDeliverables, 0) / comparison.length;
    const validCosts = comparison.filter(p => p.costPerDeliverable > 0).map(p => p.costPerDeliverable);
    const avgCost = validCosts.length > 0 ? validCosts.reduce((sum, c) => sum + c, 0) / validCosts.length : 0;

    return `
        <div class="stat-card">
            <div class="stat-value">${comparison.length}</div>
            <div class="stat-label">Profissionais</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">R$ ${formatCurrency(avgSalary)}</div>
            <div class="stat-label">Salário Médio</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${Math.round(avgDeliverables)}</div>
            <div class="stat-label">Entregas Médias</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">R$ ${avgCost > 0 ? formatCurrency(avgCost) : 'N/A'}</div>
            <div class="stat-label">Custo/Entrega Médio</div>
        </div>
    `;
}

function renderHeadToHead(comparison) {
    if (comparison.length < 2) return '';

    // Top 2 performers
    const top1 = comparison[0];
    const top2 = comparison[1];

    return `
        <div class="widget" style="margin-bottom: 2rem;">
            <div class="widget-header">
                <h2 class="widget-title">Top 2 - Cara a Cara</h2>
            </div>
            <div class="widget-body">
                <div class="comparison-card">
                    <div class="comparison-side">
                        <div class="comparison-name">${top1.name}</div>
                        <div class="comparison-value">${top1.totalDeliverables}</div>
                        <div class="comparison-label">Entregas</div>
                        <div style="margin-top: 0.5rem;">
                            <div class="comparison-label">Custo/Entrega</div>
                            <div style="color: var(--primary); font-size: 1.2rem;">
                                R$ ${top1.costPerDeliverable > 0 ? formatCurrency(top1.costPerDeliverable) : 'N/A'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="comparison-vs">VS</div>
                    
                    <div class="comparison-side">
                        <div class="comparison-name">${top2.name}</div>
                        <div class="comparison-value">${top2.totalDeliverables}</div>
                        <div class="comparison-label">Entregas</div>
                        <div style="margin-top: 0.5rem;">
                            <div class="comparison-label">Custo/Entrega</div>
                            <div style="color: var(--primary); font-size: 1.2rem;">
                                R$ ${top2.costPerDeliverable > 0 ? formatCurrency(top2.costPerDeliverable) : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderPersonCard(person) {
    const contracts = analyticsService.getPersonContracts(person.id);
    
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">${person.name}</h3>
                <span class="badge badge-success">${person.role}</span>
            </div>
            <div class="card-body">
                <div style="display: grid; gap: 1rem;">
                    <div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">Salário Mensal</div>
                        <div style="font-size: 1.25rem; font-weight: 600;">R$ ${formatCurrency(person.salary)}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem;">Contratos</div>
                            <div style="font-size: 1.25rem; font-weight: 600;">${person.contractCount}</div>
                        </div>
                        <div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem;">Entregas</div>
                            <div style="font-size: 1.25rem; font-weight: 600;">${person.totalDeliverables}</div>
                        </div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">Custo por Entrega</div>
                        <div style="font-size: 1.25rem; font-weight: 600; color: var(--primary);">
                            R$ ${person.costPerDeliverable > 0 ? formatCurrency(person.costPerDeliverable) : 'N/A'}
                        </div>
                    </div>
                    <div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">Ticket Médio</div>
                        <div style="font-size: 1.25rem; font-weight: 600;">R$ ${formatCurrency(person.averageTicket)}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderEfficiencyBar(person, allPeople) {
    const costs = allPeople.map(p => p.costPerDeliverable).filter(c => c > 0);
    if (costs.length === 0 || person.costPerDeliverable === 0) {
        return '<span style="color: var(--text-secondary);">N/A</span>';
    }

    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    
    // Invert: lower cost = higher efficiency
    const efficiency = ((maxCost - person.costPerDeliverable) / (maxCost - minCost)) * 100;
    
    return `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="progress-bar" style="width: 100px;">
                <div class="progress-fill" style="width: ${efficiency}%; background: ${
                    efficiency > 70 ? 'var(--success)' : 
                    efficiency > 40 ? 'var(--warning)' : 
                    'var(--error)'
                }"></div>
            </div>
            <span style="font-size: 0.875rem;">${efficiency.toFixed(0)}%</span>
        </div>
    `;
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
