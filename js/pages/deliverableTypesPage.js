// deliverableTypesPage.js - Deliverable types management page

import deliverableTypeService from '../services/deliverableTypeService.js';
import ROLES from '../utils/roles.js';

let currentEditId = null;
let selectedRoles = [];

export function renderDeliverableTypesPage() {
    const contentEl = document.getElementById('content');
    
    const types = deliverableTypeService.getAllDeliverableTypes();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Tipos de Entregáveis</h1>
            <p class="page-subtitle">Defina os tipos de entregáveis e quais cargos estão envolvidos</p>
        </div>

        <div class="action-bar">
            <div class="action-bar-left">
                <button class="btn btn-primary" onclick="window.openTypeModal()">
                    + Novo Tipo de Entregável
                </button>
            </div>
        </div>

        <!-- Types List -->
        <div id="types-list">
            ${renderTypesList(types)}
        </div>

        <!-- Modal -->
        <div id="type-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="modal-title">Novo Tipo de Entregável</h2>
                    <button class="modal-close" onclick="window.closeTypeModal()">&times;</button>
                </div>
                <form id="type-form">
                    <div class="form-group">
                        <label class="form-label">Nome do Tipo *</label>
                        <input type="text" class="form-input" id="name" placeholder="Ex: Criativo Estático, Vídeo, Story" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Cargos Envolvidos * (selecione todos que participam)</label>
                        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 4px; padding: 1rem; max-height: 300px; overflow-y: auto;">
                            ${ROLES.filter(role => role !== 'Head Executivo').map(role => `
                                <label style="display: block; margin: 0.75rem 0; cursor: pointer;">
                                    <input type="checkbox" value="${role}" class="role-checkbox" style="margin-right: 0.5rem;">
                                    <strong>${role}</strong>
                                </label>
                            `).join('')}
                        </div>
                        <small style="color: var(--text-secondary); display: block; margin-top: 0.5rem;">
                            Exemplo: "Criativo Estático" = Designer + Copywriter<br>
                            <em>Heads não fazem entregas específicas - custo é calculado por entregas totais do squad</em>
                        </small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Descrição</label>
                        <textarea class="form-textarea" id="description" placeholder="Descrição opcional do tipo de entregável"></textarea>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="window.closeTypeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    attachHandlers();
}

function renderTypesList(types) {
    if (types.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>Nenhum tipo de entregável cadastrado</h3>
                <p>Comece criando tipos como "Criativo Estático", "Vídeo", "Story"</p>
            </div>
        `;
    }

    return types.map(type => {
        return `
            <div class="list-item">
                <div class="list-item-header">
                    <div>
                        <div class="list-item-title">${type.name}</div>
                        ${type.description ? `
                            <div style="color: var(--text-secondary); font-size: 0.9rem;">${type.description}</div>
                        ` : ''}
                    </div>
                    <div class="list-item-actions">
                        <button class="btn btn-small btn-secondary" onclick="window.editType('${type.id}')">✏️ Editar</button>
                        <button class="btn btn-small btn-danger" onclick="window.deleteType('${type.id}')">🗑️</button>
                    </div>
                </div>
                <div class="list-item-body">
                    <div style="margin-top: 0.5rem;">
                        <strong>Cargos envolvidos:</strong> 
                        ${type.roles.map(role => `
                            <span class="badge badge-success">${role}</span>
                        `).join(' ')}
                    </div>
                    <div style="margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                        ${type.roles.length} ${type.roles.length === 1 ? 'profissional' : 'profissionais'} por entregável
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function attachHandlers() {
    const form = document.getElementById('type-form');
    form.addEventListener('submit', handleSubmit);

    window.openTypeModal = openTypeModal;
    window.closeTypeModal = closeTypeModal;
    window.editType = editType;
    window.deleteType = deleteType;
}

function openTypeModal() {
    currentEditId = null;
    selectedRoles = [];
    document.getElementById('type-modal').classList.add('active');
    document.getElementById('modal-title').textContent = 'Novo Tipo de Entregável';
    document.getElementById('type-form').reset();
    
    // Uncheck all
    document.querySelectorAll('.role-checkbox').forEach(cb => cb.checked = false);
}

function closeTypeModal() {
    document.getElementById('type-modal').classList.remove('active');
    currentEditId = null;
    selectedRoles = [];
}

function editType(id) {
    currentEditId = id;
    const type = deliverableTypeService.getDeliverableType(id);
    
    document.getElementById('name').value = type.name;
    document.getElementById('description').value = type.description || '';
    
    // Check appropriate roles
    document.querySelectorAll('.role-checkbox').forEach(cb => {
        cb.checked = type.roles.includes(cb.value);
    });

    document.getElementById('modal-title').textContent = 'Editar Tipo de Entregável';
    document.getElementById('type-modal').classList.add('active');
}

function handleSubmit(e) {
    e.preventDefault();

    const checkboxes = document.querySelectorAll('.role-checkbox:checked');
    const roles = Array.from(checkboxes).map(cb => cb.value);

    if (roles.length === 0) {
        alert('Selecione pelo menos um cargo envolvido');
        return;
    }

    const formData = {
        name: document.getElementById('name').value,
        roles: roles,
        description: document.getElementById('description').value
    };

    try {
        if (currentEditId) {
            deliverableTypeService.updateDeliverableType(currentEditId, formData);
        } else {
            deliverableTypeService.createDeliverableType(formData);
        }
        closeTypeModal();
        renderDeliverableTypesPage();
    } catch (error) {
        alert(error.message);
    }
}

function deleteType(id) {
    if (confirm('Tem certeza que deseja excluir este tipo de entregável?')) {
        try {
            deliverableTypeService.deleteDeliverableType(id);
            renderDeliverableTypesPage();
        } catch (error) {
            alert(error.message);
        }
    }
}
