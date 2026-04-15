// contractsPage.js - Contracts management page

import contractService from '../services/contractService.js';
import squadService from '../services/squadService.js';
import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';
import deliverableTypeService from '../services/deliverableTypeService.js';
import storage from '../store/storage.js';

let currentEditId = null;
let deliverables = {};

export function renderContractsPage() {
    const contentEl = document.getElementById('content');
    
    const contracts = contractService.getAllContracts();
    const squads = squadService.getAllSquads();
    const people = personService.getAllPeople();
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Contratos</h1>
            <p class="page-subtitle">Gerenciar contratos e clientes</p>
        </div>

        <div class="action-bar">
            <div class="action-bar-left">
                <button class="btn btn-primary" onclick="window.openContractModal()">
                    + Novo Contrato
                </button>
                <button class="btn btn-secondary" onclick="window.exportContracts()">
                    📥 Exportar Dados
                </button>
            </div>
        </div>

        <!-- Contracts List -->
        <div id="contracts-list">
            ${renderContractsList(contracts)}
        </div>

        <!-- Modal -->
        <div id="contract-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="modal-title">Novo Contrato</h2>
                    <button class="modal-close" onclick="window.closeContractModal()">&times;</button>
                </div>
                <form id="contract-form">
                    <div class="form-group">
                        <label class="form-label">Cliente *</label>
                        <input type="text" class="form-input" id="client" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Valor Mensal (R$) *</label>
                        <input type="number" class="form-input" id="value" step="0.01" min="0" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Entregáveis</label>
                        <div id="deliverables-container"></div>
                        ${deliverableTypes.length > 0 ? `
                            <div class="flex gap-2 mt-2">
                                <select class="form-select" id="deliverable-type-select" style="flex: 2;">
                                    <option value="">Selecione o tipo...</option>
                                    ${deliverableTypes.map(type => `
                                        <option value="${type.id}">${type.name} (${type.roles.join(', ')})</option>
                                    `).join('')}
                                </select>
                                <input type="number" class="form-input" id="deliverable-qty" placeholder="Qtd" min="1" style="flex: 1;">
                                <button type="button" class="btn btn-secondary" onclick="window.addDeliverable()">+</button>
                            </div>
                        ` : `
                            <div style="padding: 1rem; background: rgba(255, 170, 0, 0.1); border-left: 3px solid var(--warning); border-radius: 4px;">
                                <strong>Nenhum tipo de entregável cadastrado</strong>
                                <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary);">
                                    Primeiro cadastre tipos de entregáveis na aba <a href="#/deliverables" style="color: var(--primary);">Entregáveis</a>
                                </p>
                            </div>
                        `}
                    </div>

                    <div class="form-group">
                        <label class="form-label">Atribuição</label>
                        <select class="form-select" id="assignment-type" onchange="window.toggleAssignment()">
                            <option value="">Nenhuma</option>
                            <option value="squad">Squad</option>
                            <option value="people">Pessoas</option>
                        </select>
                    </div>

                    <div class="form-group" id="squad-select-group" style="display: none;">
                        <label class="form-label">Squad</label>
                        <select class="form-select" id="squad-select">
                            <option value="">Selecione um squad</option>
                            ${squads.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group" id="people-select-group" style="display: none;">
                        <label class="form-label">Pessoas</label>
                        <div id="people-checkboxes">
                            ${people.map(p => `
                                <label style="display: block; margin: 0.5rem 0;">
                                    <input type="checkbox" value="${p.id}" class="person-checkbox">
                                    ${p.name} (${p.role})
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Observações</label>
                        <textarea class="form-textarea" id="notes"></textarea>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="window.closeContractModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    attachContractHandlers();
    renderDeliverables();
}

function renderContractsList(contracts) {
    if (contracts.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>Nenhum contrato cadastrado</h3>
                <p>Comece criando seu primeiro contrato</p>
            </div>
        `;
    }

    return contracts.map(contract => {
        const roi = analyticsService.getContractROI(contract.id);
        const squad = contract.squadId ? squadService.getSquad(contract.squadId) : null;
        const assignedPeople = contract.assignedPeople || [];
        
        return `
            <div class="list-item">
                <div class="list-item-header">
                    <div class="list-item-title">${contract.client}</div>
                    <div class="list-item-actions">
                        <button class="btn btn-small btn-secondary" onclick="window.editContract('${contract.id}')">✏️ Editar</button>
                        <button class="btn btn-small btn-danger" onclick="window.deleteContract('${contract.id}')">🗑️</button>
                    </div>
                </div>
                <div class="list-item-body">
                    <div class="list-item-meta">
                        <div class="list-item-meta-item">
                            <strong>Valor:</strong> R$ ${formatCurrency(contract.value)}
                        </div>
                        <div class="list-item-meta-item">
                            <strong>Lucro:</strong> 
                            <span class="badge ${roi.profit > 0 ? 'badge-success' : 'badge-error'}">
                                R$ ${formatCurrency(roi.profit)}
                            </span>
                        </div>
                        <div class="list-item-meta-item">
                            <strong>Margem:</strong> ${roi.margin.toFixed(1)}%
                        </div>
                        ${squad ? `
                            <div class="list-item-meta-item">
                                <strong>Squad:</strong> ${squad.name}
                            </div>
                        ` : ''}
                        ${assignedPeople.length > 0 ? `
                            <div class="list-item-meta-item">
                                <strong>Pessoas:</strong> ${assignedPeople.length}
                            </div>
                        ` : ''}
                    </div>
                    ${Object.keys(contract.deliverables || {}).length > 0 ? `
                        <div style="margin-top: 0.5rem;">
                            <strong>Entregáveis:</strong> 
                            ${Object.entries(contract.deliverables).map(([typeId, qty]) => {
                                const type = deliverableTypeService.getDeliverableType(typeId);
                                const typeName = type ? type.name : 'Tipo removido';
                                const roles = type ? ` (${type.roles.join(', ')})` : '';
                                return `<span class="badge badge-success">${typeName}: ${qty}${roles}</span>`;
                            }).join(' ')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function attachContractHandlers() {
    const form = document.getElementById('contract-form');
    form.addEventListener('submit', handleContractSubmit);

    // Global functions
    window.openContractModal = openContractModal;
    window.closeContractModal = closeContractModal;
    window.editContract = editContract;
    window.deleteContract = deleteContract;
    window.addDeliverable = addDeliverable;
    window.removeDeliverable = removeDeliverable;
    window.toggleAssignment = toggleAssignment;
    window.exportContracts = exportContracts;
}

function openContractModal() {
    currentEditId = null;
    deliverables = {};
    document.getElementById('contract-modal').classList.add('active');
    document.getElementById('modal-title').textContent = 'Novo Contrato';
    document.getElementById('contract-form').reset();
    renderDeliverables();
}

function closeContractModal() {
    document.getElementById('contract-modal').classList.remove('active');
    currentEditId = null;
    deliverables = {};
}

function editContract(id) {
    currentEditId = id;
    const contract = contractService.getContract(id);
    
    document.getElementById('client').value = contract.client;
    document.getElementById('value').value = contract.value;
    document.getElementById('notes').value = contract.notes || '';
    
    deliverables = { ...contract.deliverables };
    renderDeliverables();

    if (contract.squadId) {
        document.getElementById('assignment-type').value = 'squad';
        document.getElementById('squad-select').value = contract.squadId;
        toggleAssignment();
    } else if (contract.assignedPeople && contract.assignedPeople.length > 0) {
        document.getElementById('assignment-type').value = 'people';
        contract.assignedPeople.forEach(personId => {
            const checkbox = document.querySelector(`.person-checkbox[value="${personId}"]`);
            if (checkbox) checkbox.checked = true;
        });
        toggleAssignment();
    }

    document.getElementById('modal-title').textContent = 'Editar Contrato';
    document.getElementById('contract-modal').classList.add('active');
}

function handleContractSubmit(e) {
    e.preventDefault();

    const formData = {
        client: document.getElementById('client').value,
        value: parseFloat(document.getElementById('value').value),
        deliverables: deliverables,
        notes: document.getElementById('notes').value
    };

    const assignmentType = document.getElementById('assignment-type').value;
    if (assignmentType === 'squad') {
        formData.squadId = document.getElementById('squad-select').value;
    } else if (assignmentType === 'people') {
        const checkboxes = document.querySelectorAll('.person-checkbox:checked');
        formData.assignedPeople = Array.from(checkboxes).map(cb => cb.value);
    }

    try {
        if (currentEditId) {
            contractService.updateContract(currentEditId, formData);
        } else {
            contractService.createContract(formData);
        }
        closeContractModal();
        renderContractsPage();
    } catch (error) {
        alert(error.message);
    }
}

function deleteContract(id) {
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
        contractService.deleteContract(id);
        renderContractsPage();
    }
}

function addDeliverable() {
    const typeSelect = document.getElementById('deliverable-type-select');
    const typeId = typeSelect?.value;
    const qty = parseInt(document.getElementById('deliverable-qty').value);

    if (!typeId) {
        alert('Selecione um tipo de entregável');
        return;
    }

    if (!qty || qty < 1) {
        alert('Informe uma quantidade válida');
        return;
    }

    const type = deliverableTypeService.getDeliverableType(typeId);
    if (!type) {
        alert('Tipo de entregável não encontrado');
        return;
    }

    deliverables[typeId] = qty;
    
    if (typeSelect) typeSelect.value = '';
    document.getElementById('deliverable-qty').value = '';
    renderDeliverables();
}

function removeDeliverable(typeId) {
    delete deliverables[typeId];
    renderDeliverables();
}

function renderDeliverables() {
    const container = document.getElementById('deliverables-container');
    if (!container) return;

    if (Object.keys(deliverables).length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Nenhum entregável adicionado</p>';
        return;
    }

    container.innerHTML = `
        <div class="tag-container">
            ${Object.entries(deliverables).map(([typeId, qty]) => {
                const type = deliverableTypeService.getDeliverableType(typeId);
                const typeName = type ? type.name : 'Desconhecido';
                const roles = type ? ` (${type.roles.join(', ')})` : '';
                return `
                    <span class="tag">
                        ${typeName}: ${qty}${roles}
                        <button type="button" class="tag-remove" onclick="window.removeDeliverable('${typeId}')">&times;</button>
                    </span>
                `;
            }).join('')}
        </div>
    `;
}

function toggleAssignment() {
    const type = document.getElementById('assignment-type').value;
    document.getElementById('squad-select-group').style.display = type === 'squad' ? 'block' : 'none';
    document.getElementById('people-select-group').style.display = type === 'people' ? 'block' : 'none';
}

function exportContracts() {
    const data = storage.exportData();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agency-analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
