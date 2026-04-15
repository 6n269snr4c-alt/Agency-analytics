// comparePage.js - Detailed comparison tools

import analyticsService from '../services/analyticsService.js';
import personService from '../services/personService.js';

export function renderComparePage() {
    const contentEl = document.getElementById('content');
    
    const roles = personService.getAllRoles();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Comparações</h1>
            <p class="page-subtitle">Compare profissionais e analise eficiência</p>
        </div>

        <div class="tabs">
            <button class="tab active" data-tab="by-role">Por Cargo</button>
            <button class="tab" data-tab="productivity">Produtividade Geral</button>
        </div>

        <div id="tab-content"></div>
    `;

    attachCompareHandlers();
    renderByRoleTab();
}

function attachCompareHandlers() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabName = tab.getAttribute('data-tab');
            if (tabName === 'by-role') {
                renderByRoleTab();
            } else if (tabName === 'productivity') {
                renderProductivityTab();
            }
        });
    });
}

function renderByRoleTab() {
    const roles = personService.getAllRoles();
    const contentEl = document.getElementById('tab-content');

    if (roles.length === 0) {
        contentEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>Nenhuma pessoa cadastrada ainda</p>
            </div>
        `;
        return;
    }

    contentEl.innerHTML = `
        <div class="form-group" style="max-width: 300px;">
            <label class="form-label">Selecione um cargo</label>
            <select class="form-select" id="role-selector">
                <option value="">Escolha um cargo</option>
                ${roles.map(role => `<option value="${role}">${role}</option>`).join('')}
            </select>
        </div>
        <div id="comparison-results"></div>
    `;

    document.getElementById('role-selector').addEventListener('change', (e) => {
        const role = e.target.value;
        if (role) {
            renderRoleComparison(role);
        } else {
            document.getElementById('comparison-results').innerHTML = '';
        }
    });
}

function renderRoleComparison(role) {
    const comparison = analyticsService.comparePeopleByRole(role);
    const resultsEl = document.getElementById('comparison-results');

    if (comparison.length === 0) {
        resultsEl.innerHTML = `<p style="margin-top: 1rem; color: var(--text-secondary);">Nenhuma pessoa encontrada para este cargo.</p>`;
        return;
    }

    if (comparison.length === 1) {
        resultsEl.innerHTML = `<p style="margin-top: 1rem; color: var(--text-secondary);">Apenas 1 pessoa com este cargo. Adicione mais para comparar.</p>`;
        return;
    }

    resultsEl.innerHTML = `
        <div style="margin-top: 2rem;">
            <h3 style="margin-bottom: 1rem;">Comparação: ${role}</h3>
            
            <!-- Head to Head Comparisons -->
            ${renderHeadToHead(comparison)}
            
            <!-- Detailed Table -->
            <div class="table-container" style="margin-top: 2rem;">
                <table>
                    <thead>
                        <tr>
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
                        ${comparison.map((person, index) => {
                            const efficiency = person.totalDeliverables > 0 
                                ? ((person.salary / person.totalDeliverables) / comparison[0].costPerDeliverable * 100).toFixed(0)
                                : 0;
                            
                            return `
                                <tr>
                                    <td>
                                        <strong>${person.name}</strong>
                                        ${index === 0 ? '<span class="badge badge-success">Mais Eficiente</span>' : ''}
                                    </td>
                                    <td>R$ ${formatCurrency(person.salary)}</td>
                                    <td>${person.contractCount}</td>
                                    <td>${person.totalDeliverables}</td>
                                    <td>
                                        ${person.costPerDeliverable > 0 
                                            ? `R$ ${formatCurrency(person.costPerDeliverable)}`
                                            : 'N/A'
                                        }
                                    </td>
                                    <td>R$ ${formatCurrency(person.averageTicket)}</td>
                                    <td>
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${efficiency}%"></div>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderHeadToHead(comparison) {
    if (comparison.length < 2) return '';

    const pairs = [];
    for (let i = 0; i < comparison.length - 1; i++) {
        pairs.push([comparison[i], comparison[i + 1]]);
    }

    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            ${pairs.map(([p1, p2]) => `
                <div class="comparison-card">
                    <div class="comparison-side">
                        <div class="comparison-name">${p1.name}</div>
                        <div class="comparison-value">${p1.totalDeliverables}</div>
                        <div class="comparison-label">Entregas</div>
                        <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                            R$ ${formatCurrency(p1.costPerDeliverable)}/entrega
                        </div>
                    </div>
                    <div class="comparison-vs">VS</div>
                    <div class="comparison-side">
                        <div class="comparison-name">${p2.name}</div>
                        <div class="comparison-value">${p2.totalDeliverables}</div>
                        <div class="comparison-label">Entregas</div>
                        <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                            R$ ${formatCurrency(p2.costPerDeliverable)}/entrega
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderProductivityTab() {
    const ranking = analyticsService.getProductivityRanking();
    const contentEl = document.getElementById('tab-content');

    if (ranking.length === 0) {
        contentEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>Nenhum dado de produtividade disponível</p>
            </div>
        `;
        return;
    }

    contentEl.innerHTML = `
        <div style="margin-top: 1rem;">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Ranking</th>
                            <th>Nome</th>
                            <th>Cargo</th>
                            <th>Entregas</th>
                            <th>Contratos</th>
                            <th>Custo/Entrega</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ranking.map((person, index) => `
                            <tr>
                                <td>
                                    <div class="ranking-position" style="font-size: 1.2rem; min-width: 30px;">
                                        ${index + 1}
                                    </div>
                                </td>
                                <td><strong>${person.name}</strong></td>
                                <td>${person.role}</td>
                                <td>${person.totalDeliverables}</td>
                                <td>${person.contractCount}</td>
                                <td>
                                    ${person.costPerDeliverable > 0 
                                        ? `R$ ${formatCurrency(person.costPerDeliverable)}`
                                        : 'N/A'
                                    }
                                </td>
                                <td>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${(person.score / ranking[0].score * 100)}%"></div>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
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
