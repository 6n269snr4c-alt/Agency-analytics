// peoplePage.js - People management page

import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';

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
                        <input type="text" class="form-input" id="role" list="role-suggestions" required>
                        <datalist id="role-suggestions">
                            ${roles.map(role => `<option value="${role}">`).join('')}
                            <option value="Designer">
                            <option value="Copy">
                            <option value="Head Executivo">
                            <option value="Gestor de Tráfego">
                            <option value="Editor de Vídeo">
                        </datalist>
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

    return people.map(person => {
        const contracts = analyticsService.getPersonContracts(person.id);
        const totalDeliverables = analyticsService.getPersonTotalDeliverables(person.id);
        const breakdown = analyticsService.getPersonDeliverablesBreakdown(person.id);
        const costPerDeliverable = analyticsService.getPersonCostPerDeliverable(person.id);
        const avgTicket = analyticsService.getPersonAverageTicket(person.id);
        const squads = personService.getPersonSquads(person.id);

        return `
            <div class="list-item">
                <div class="list-item-header">
                    <div>
                        <div class="list-item-title">${person.name}</div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">${person.role}</div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn btn-small btn-secondary" onclick="window.editPerson('${person.id}')">✏️ Editar</button>
                        <button class="btn btn-small btn-danger" onclick="window.deletePerson('${person.id}')">🗑️</button>
                    </div>
                </div>
                <div class="list-item-body">
                    <div class="list-item-meta">
                        <div class="list-item-meta-item">
                            <strong>Salário:</strong> R$ ${formatCurrency(person.salary)}
                        </div>
                        <div class="list-item-meta-item">
                            <strong>Contratos:</strong> ${contracts.length}
                        </div>
                        <div class="list-item-meta-item">
                            <strong>Entregas:</strong> ${totalDeliverables}
                        </div>
                        ${costPerDeliverable > 0 ? `
                            <div class="list-item-meta-item">
                                <strong>Custo/Entrega:</strong> R$ ${formatCurrency(costPerDeliverable)}
                            </div>
                        ` : ''}
                        ${avgTicket > 0 ? `
                            <div class="list-item-meta-item">
                                <strong>Ticket Médio:</strong> R$ ${formatCurrency(avgTicket)}
                            </div>
                        ` : ''}
                    </div>
                    ${Object.keys(breakdown.byType).length > 0 ? `
                        <div style="margin-top: 0.5rem;">
                            <strong>Entregas por tipo:</strong> 
                            ${Object.entries(breakdown.byType).map(([type, qty]) => 
                                `<span class="badge badge-success">${type}: ${qty}</span>`
                            ).join(' ')}
                        </div>
                    ` : ''}
                    ${squads.length > 0 ? `
                        <div style="margin-top: 0.5rem;">
                            <strong>Squads:</strong> 
                            ${squads.map(s => `<span class="badge badge-success">${s.name}</span>`).join(' ')}
                        </div>
                    ` : ''}
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
