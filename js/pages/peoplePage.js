// peoplePage.js - COM BREAKDOWN DETALHADO

import { renderPeriodSelector } from '../components/periodSelector.js';
import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';
import deliverableTypeService from '../services/deliverableTypeService.js';
import ROLES from '../utils/roles.js';

let currentEditId = null;

export function renderPeoplePage() {
    const contentEl = document.getElementById('content');
    
    const people = personService.getAllPeople();
    const roles = personService.getAllRoles();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Pessoas</h1>
            <p class="page-subtitle">Gerenciar equipe e colaboradores</p>
        </div>

        ${renderPeriodSelector()}

        <div class="action-bar">
            <div class="action-bar-left">
                <button class="btn btn-primary" onclick="window.openPersonModal()">
                    + Nova Pessoa
                </button>
            </div>
        </div>

        <div id="people-list">
            ${renderPeopleList(people)}
        </div>

        <!-- Modal de Edição -->
        <div id="person-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="modal-title">Nova Pessoa</h2>
                    <button class="modal-close" onclick="window.closePersonModal()">&times;</button>
                </div>
                <form id="person-form">
                    <div class="form-group">
                        <label class="form-label">Nome *</label>
                        <input type="text" class="form-input" id="name" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Cargo *</label>
                        <select class="form-select" id="role" required>
                            <option value="">Selecione um cargo</option>
                            ${ROLES.map(role => `<option value="${role}">${role}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Salário Mensal (R$) *</label>
                        <input type="number" class="form-input" id="salary" step="0.01" min="0" required>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="window.closePersonModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal de Breakdown Detalhado -->
        <div id="person-breakdown-modal" class="modal">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2 class="modal-title" id="breakdown-title">Detalhamento de Custos</h2>
                    <button class="modal-close" onclick="window.closePersonBreakdownModal()">&times;</button>
                </div>
                <div id="breakdown-content" style="padding: 1.5rem;"></div>
            </div>
        </div>
    `;

    attachPeopleHandlers();
}

function renderPeopleList(people) {
    if (people.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <h3>Nenhuma pessoa cadastrada</h3>
                <p>Comece adicionando membros da sua equipe</p>
            </div>
        `;
    }

    const peopleByRole = {};
    people.forEach(person => {
        if (!peopleByRole[person.role]) {
            peopleByRole[person.role] = [];
        }
        peopleByRole[person.role].push(person);
    });

    const sortedRoles = Object.keys(peopleByRole).sort();

    return sortedRoles.map(role => {
        const peopleInRole = peopleByRole[role];

        return `
            <div style="margin-bottom: 3rem;">
                <h3 style="color: var(--primary); margin-bottom: 1rem; font-size: 1.3rem; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${role}
                </h3>
                
                <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                    <!-- Table Header -->
                    <div style="display: grid; grid-template-columns: 2fr 1.2fr 0.8fr 0.8fr 1.5fr 1.2fr 1.3fr auto; gap: 1rem; padding: 1rem; background: var(--bg); border-bottom: 2px solid var(--border); font-weight: bold; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase;">
                        <div>Nome</div>
                        <div>Salário</div>
                        <div>Contr.</div>
                        <div>Entreg.</div>
                        <div>Tipo de Entrega</div>
                        <div>Custo/Ent</div>
                        <div>Ticket Médio</div>
                        <div>Ações</div>
                    </div>
                    
                    <!-- Table Rows -->
                    ${peopleInRole.map(person => {
                        const contracts = analyticsService.getPersonContracts(person.id);
                        const totalDeliverables = analyticsService.getPersonTotalDeliverables(person.id);
                        const costPerDeliverable = analyticsService.getPersonCostPerDeliverable(person.id);
                        const avgTicket = analyticsService.getPersonAverageTicket(person.id);
                        const breakdown = analyticsService.getPersonDeliverablesBreakdown(person.id);

                        return `
                            <div style="display: grid; grid-template-columns: 2fr 1.2fr 0.8fr 0.8fr 1.5fr 1.2fr 1.3fr auto; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--border); align-items: center;">
                                <div style="font-weight: 500;">${person.name}</div>
                                <div>R$ ${formatCurrency(person.salary)}</div>
                                <div>${contracts.length}</div>
                                <div>${totalDeliverables}</div>
                                <div style="font-size: 0.85rem;">
                                    ${Object.keys(breakdown.byType).length > 0 ? 
                                        Object.entries(breakdown.byType)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 3)
                                            .map(([type, qty]) => `<div>${type}: <strong>${qty}</strong></div>`)
                                            .join('')
                                    : '<span style="color: var(--text-secondary);">-</span>'}
                                </div>
                                <div style="color: var(--primary); font-weight: bold;">
                                    ${costPerDeliverable > 0 ? `R$ ${formatCurrency(costPerDeliverable)}` : '-'}
                                </div>
                                <div style="color: var(--success); font-weight: bold;">
                                    ${avgTicket > 0 ? `R$ ${formatCurrency(avgTicket)}` : '-'}
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-small btn-primary" onclick="window.showPersonBreakdown('${person.id}')" title="Ver Cálculo Detalhado">
                                        🔍
                                    </button>
                                    <button class="btn btn-small btn-secondary" onclick="window.editPerson('${person.id}')" title="Editar">✏️</button>
                                    <button class="btn btn-small btn-danger" onclick="window.deletePerson('${person.id}')" title="Excluir">🗑️</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// BREAKDOWN DETALHADO DA PESSOA
function showPersonBreakdown(personId) {
    const person = personService.getPerson(personId);
    const contracts = analyticsService.getPersonContracts(personId);
    const totalWeightedPoints = analyticsService.getPersonTotalWeightedDeliverables(personId);
    const costPerPoint = person.salary / totalWeightedPoints;
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();
    
    document.getElementById('breakdown-title').textContent = `${person.name} - Detalhamento de Custos`;
    
    // Informações gerais
    const infoHtml = `
        <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; color: var(--fast-green); font-size: 1rem; text-transform: uppercase;">💼 Informações Gerais</h3>
            <div style="display: grid; gap: 0.5rem;">
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>Cargo:</span>
                    <strong>${person.role}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>Salário Mensal:</span>
                    <strong>R$ ${formatCurrency(person.salary)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>Contratos Ativos:</span>
                    <strong>${contracts.length}</strong>
                </div>
            </div>
        </div>
    `;
    
    // Breakdown por contrato
    let contractsHtml = '';
    if (contracts.length > 0) {
        contractsHtml = `
            <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; color: var(--fast-green); font-size: 1rem; text-transform: uppercase;">📊 Distribuição por Contrato</h3>
                ${contracts.map(contract => {
                    // Calcular pontos ponderados deste contrato
                    let contractWeightedPoints = 0;
                    let deliverablesDetail = [];
                    
                    if (contract.deliverables) {
                        Object.entries(contract.deliverables).forEach(([typeId, qty]) => {
                            const type = deliverableTypes.find(dt => dt.id === typeId);
                            if (type && type.roles && type.roles.includes(person.role)) {
                                const weight = analyticsService.getWeightForRole(person.role, typeId);
                                const points = qty * weight;
                                contractWeightedPoints += points;
                                deliverablesDetail.push({
                                    name: type.name,
                                    qty,
                                    weight,
                                    points
                                });
                            }
                        });
                    }
                    
                    const contractCost = contractWeightedPoints * costPerPoint;
                    
                    if (contractWeightedPoints === 0) return '';
                    
                    return `
                        <div style="background: var(--bg); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <strong style="color: var(--fast-green);">${contract.client}</strong>
                                <span style="color: var(--fast-green); font-weight: bold;">R$ ${formatCurrency(contractCost)}</span>
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                                ${deliverablesDetail.map(d => `
                                    ├─ ${d.qty} ${d.name} × peso ${d.weight.toFixed(1)} = ${d.points.toFixed(1)} pontos
                                `).join('<br>')}
                                <br>
                                └─ <strong style="color: var(--text-primary);">SUBTOTAL: ${contractWeightedPoints.toFixed(1)} pontos × R$ ${formatCurrency(costPerPoint)} = R$ ${formatCurrency(contractCost)}</strong>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    // Resumo final
    const summaryHtml = `
        <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; border: 2px solid var(--fast-green);">
            <h3 style="color: var(--fast-green); margin: 0 0 1rem 0; font-size: 1rem; text-transform: uppercase;">✅ Resumo do Cálculo</h3>
            <div style="display: grid; gap: 0.75rem;">
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>📦 Total de Pontos (todos contratos):</span>
                    <strong>${totalWeightedPoints.toFixed(1)} pontos</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>💰 Custo por Ponto:</span>
                    <strong>R$ ${formatCurrency(person.salary)} ÷ ${totalWeightedPoints.toFixed(1)} = R$ ${formatCurrency(costPerPoint)}/ponto</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px; border: 1px solid var(--fast-green);">
                    <span style="font-weight: 700;">✅ Validação:</span>
                    <strong style="color: var(--fast-green);">${totalWeightedPoints.toFixed(1)} × R$ ${formatCurrency(costPerPoint)} = R$ ${formatCurrency(totalWeightedPoints * costPerPoint)}</strong>
                </div>
                ${Math.abs((totalWeightedPoints * costPerPoint) - person.salary) < 0.01 ? `
                    <div style="text-align: center; padding: 0.75rem; background: var(--success); color: white; border-radius: 4px; font-weight: bold;">
                        ✓ Cálculo correto! O total bate com o salário.
                    </div>
                ` : `
                    <div style="text-align: center; padding: 0.75rem; background: var(--error); color: white; border-radius: 4px; font-weight: bold;">
                        ⚠️ Diferença detectada! Verifique os contratos.
                    </div>
                `}
            </div>
        </div>
    `;
    
    document.getElementById('breakdown-content').innerHTML = infoHtml + contractsHtml + summaryHtml;
    document.getElementById('person-breakdown-modal').classList.add('active');
}

function closePersonBreakdownModal() {
    document.getElementById('person-breakdown-modal').classList.remove('active');
}

function attachPeopleHandlers() {
    const form = document.getElementById('person-form');
    form.addEventListener('submit', handlePersonSubmit);

    window.openPersonModal = openPersonModal;
    window.closePersonModal = closePersonModal;
    window.editPerson = editPerson;
    window.deletePerson = deletePerson;
    window.showPersonBreakdown = showPersonBreakdown;
    window.closePersonBreakdownModal = closePersonBreakdownModal;
}

function openPersonModal() {
    currentEditId = null;
    document.getElementById('person-modal').classList.add('active');
    document.getElementById('modal-title').textContent = 'Nova Pessoa';
    document.getElementById('person-form').reset();
}

function closePersonModal() {
    document.getElementById('person-modal').classList.remove('active');
    currentEditId = null;
}

function editPerson(id) {
    currentEditId = id;
    const person = personService.getPerson(id);
    
    document.getElementById('name').value = person.name;
    document.getElementById('role').value = person.role;
    document.getElementById('salary').value = person.salary;

    document.getElementById('modal-title').textContent = 'Editar Pessoa';
    document.getElementById('person-modal').classList.add('active');
}

function handlePersonSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('name').value,
        role: document.getElementById('role').value,
        salary: parseFloat(document.getElementById('salary').value)
    };

    try {
        if (currentEditId) {
            personService.updatePerson(currentEditId, formData);
        } else {
            personService.createPerson(formData);
        }
        closePersonModal();
        renderPeoplePage();
    } catch (error) {
        alert(error.message);
    }
}

function deletePerson(id) {
    if (confirm('Tem certeza que deseja excluir esta pessoa?')) {
        try {
            personService.deletePerson(id);
            renderPeoplePage();
        } catch (error) {
            alert(error.message);
        }
    }
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
