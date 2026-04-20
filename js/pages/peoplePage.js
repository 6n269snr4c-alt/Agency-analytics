// peoplePage.js - People management page

import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';
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

        <div class="action-bar">
            <div class="action-bar-left">
                <button class="btn btn-primary" onclick="window.openPersonModal()">
                    + Nova Pessoa
                </button>
            </div>
        </div>

        <!-- People List -->
        <div id="people-list">
            ${renderPeopleList(people)}
        </div>

        <!-- Modal -->
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

    // Group people by role
    const peopleByRole = {};
    people.forEach(person => {
        if (!peopleByRole[person.role]) {
            peopleByRole[person.role] = [];
        }
        peopleByRole[person.role].push(person);
    });

    // Sort roles alphabetically
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
                        <div>Ticket Médio Clientes</div>
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
                                    <button class="btn btn-small btn-secondary" onclick="window.editPerson('${person.id}')">✏️</button>
                                    <button class="btn btn-small btn-danger" onclick="window.deletePerson('${person.id}')">🗑️</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}
                                                <div style="display: flex; justify-content: space-between;">
                                                    <span>${type}</span>
                                                    <strong style="color: var(--primary);">${qty}</strong>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </details>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function attachPeopleHandlers() {
    const form = document.getElementById('person-form');
    form.addEventListener('submit', handlePersonSubmit);

    window.openPersonModal = openPersonModal;
    window.closePersonModal = closePersonModal;
    window.editPerson = editPerson;
    window.deletePerson = deletePerson;
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
