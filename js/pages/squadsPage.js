// squadsPage.js - Squads management page
import { renderPeriodSelector } from '../components/periodSelector.js';

import squadService from '../services/squadService.js';
import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';

let currentEditId = null;

export function renderSquadsPage() {
    const contentEl = document.getElementById('content');
    
    const squads = squadService.getAllSquads();
    const people = personService.getAllPeople();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Squads</h1>
            <p class="page-subtitle">Gerenciar equipes e grupos de trabalho</p>
        </div>

        <!-- Period Selector -->
        ${renderPeriodSelector()}

        <div class="action-bar">
            <div class="action-bar-left">
                <button class="btn btn-primary" onclick="window.openSquadModal()">
                    + Novo Squad
                </button>
            </div>
        </div>

        <!-- Squads List -->
        <div id="squads-list">
            ${renderSquadsList(squads)}
        </div>

        <!-- Modal -->
        <div id="squad-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="modal-title">Novo Squad</h2>
                    <button class="modal-close" onclick="window.closeSquadModal()">&times;</button>
                </div>
                <form id="squad-form">
                    <div class="form-group">
                        <label class="form-label">Nome do Squad *</label>
                        <input type="text" class="form-input" id="name" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Ícone</label>
                        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">
                            Escolha um emoji para representar o squad
                        </p>
                        <select class="form-select" id="icon">
                            <option value="">Nenhum</option>
                            <option value="🦁">🦁 Leão</option>
                            <option value="🦅">🦅 Águia</option>
                            <option value="🐯">🐯 Tigre</option>
                            <option value="🐺">🐺 Lobo</option>
                            <option value="🦈">🦈 Tubarão</option>
                            <option value="🐉">🐉 Dragão</option>
                            <option value="🦊">🦊 Raposa</option>
                            <option value="🐆">🐆 Leopardo</option>
                            <option value="🦎">🦎 Lagarto</option>
                            <option value="⚡">⚡ Raio</option>
                            <option value="🔥">🔥 Fogo</option>
                            <option value="💎">💎 Diamante</option>
                            <option value="🚀">🚀 Foguete</option>
                            <option value="⭐">⭐ Estrela</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Descrição</label>
                        <textarea class="form-textarea" id="description"></textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Head Executivo</label>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                            Líder do squad - custo será rateado entre todos os contratos
                        </p>
                        <select class="form-select" id="head-select">
                            <option value="">Nenhum</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Membros</label>
                        <div id="members-checkboxes"></div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="window.closeSquadModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    attachSquadsHandlers();
}

function renderSquadsList(squads) {
    if (squads.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <h3>Nenhum squad cadastrado</h3>
                <p>Comece criando seu primeiro squad</p>
            </div>
        `;
    }

    return squads.map(squad => {
        const members = squadService.getSquadMembers(squad.id);
        const head = squadService.getSquadHead(squad.id);
        const squadCost = squadService.getSquadCost(squad.id);
        const roi = analyticsService.getSquadROI(squad.id);

        return `
            <div class="list-item">
                <div class="list-item-header">
                    <div>
                        <div class="list-item-title">
                            ${squad.icon ? `<span style="font-size: 1.5rem; margin-right: 0.5rem;">${squad.icon}</span>` : ''}
                            ${squad.name}
                            ${head ? `<span class="badge badge-success" style="margin-left: 0.5rem;">Head: ${head.name}</span>` : ''}
                        </div>
                        ${squad.description ? `
                            <div style="color: var(--text-secondary); font-size: 0.9rem;">${squad.description}</div>
                        ` : ''}
                    </div>
                    <div class="list-item-actions">
                        <button class="btn btn-small btn-secondary" onclick="window.editSquad('${squad.id}')">✏️ Editar</button>
                        <button class="btn btn-small btn-danger" onclick="window.deleteSquad('${squad.id}')">🗑️</button>
                    </div>
                </div>
                <div class="list-item-body">
                    <div class="list-item-meta">
                        <div class="list-item-meta-item">
                            <strong>Membros:</strong> ${members.length}
                        </div>
                        ${head ? `
                            <div class="list-item-meta-item">
                                <strong>Custo Head:</strong> R$ ${formatCurrency(head.salary)}
                            </div>
                        ` : ''}
                        <div class="list-item-meta-item">
                            <strong>Custo Time:</strong> R$ ${formatCurrency(squadCost)}
                        </div>
                        <div class="list-item-meta-item">
                            <strong>Contratos:</strong> ${roi.contractCount}
                        </div>
                        <div class="list-item-meta-item">
                            <strong>Receita:</strong> R$ ${formatCurrency(roi.revenue)}
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
                    </div>
                    ${members.length > 0 ? `
                        <div style="margin-top: 0.5rem;">
                            <strong>Time:</strong> 
                            ${members.map(m => `
                                <span class="badge badge-success">${m.name} (${m.role})</span>
                            `).join(' ')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function attachSquadsHandlers() {
    const form = document.getElementById('squad-form');
    form.addEventListener('submit', handleSquadSubmit);

    window.openSquadModal = openSquadModal;
    window.closeSquadModal = closeSquadModal;
    window.editSquad = editSquad;
    window.deleteSquad = deleteSquad;
}

function openSquadModal() {
    currentEditId = null;
    document.getElementById('squad-modal').classList.add('active');
    document.getElementById('modal-title').textContent = 'Novo Squad';
    document.getElementById('squad-form').reset();
    renderHeadSelect();
    renderMembersCheckboxes();
}

function closeSquadModal() {
    document.getElementById('squad-modal').classList.remove('active');
    currentEditId = null;
}

function renderHeadSelect(selectedHeadId = null) {
    const headSelect = document.getElementById('head-select');
    const people = personService.getAllPeople();
    
    // Filter only Head Executivo role
    const heads = people.filter(p => p.role === 'Head Executivo');
    
    headSelect.innerHTML = '<option value="">Nenhum</option>' + 
        heads.map(head => `
            <option value="${head.id}" ${selectedHeadId === head.id ? 'selected' : ''}>
                ${head.name} - R$ ${formatCurrency(head.salary)}
            </option>
        `).join('');
    
    // Add event listener to update members list when head changes
    headSelect.addEventListener('change', () => {
        const squad = currentEditId ? squadService.getSquad(currentEditId) : null;
        const selectedMembers = squad ? squad.members : [];
        renderMembersCheckboxes(selectedMembers);
    });
}

function editSquad(id) {
    currentEditId = id;
    const squad = squadService.getSquad(id);
    
    document.getElementById('name').value = squad.name;
    document.getElementById('icon').value = squad.icon || '';
    document.getElementById('description').value = squad.description || '';

    renderHeadSelect(squad.headId);
    renderMembersCheckboxes(squad.members);

    document.getElementById('modal-title').textContent = 'Editar Squad';
    document.getElementById('squad-modal').classList.add('active');
}

function renderMembersCheckboxes(selectedMembers = []) {
    const container = document.getElementById('members-checkboxes');
    const availablePeople = squadService.getAvailablePeople(currentEditId);
    
    // Get current selected head
    const headSelect = document.getElementById('head-select');
    const selectedHeadId = headSelect ? headSelect.value : null;

    if (availablePeople.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Nenhuma pessoa cadastrada</p>';
        return;
    }

    // Filter out the selected head from members list
    const selectableMembers = availablePeople.filter(person => 
        person.id !== selectedHeadId
    );

    if (selectableMembers.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Nenhuma pessoa disponível (Head já selecionado)</p>';
        return;
    }

    container.innerHTML = selectableMembers.map(person => {
        const personSquads = personService.getPersonSquadNames(person.id);
        const otherSquads = currentEditId ? 
            personSquads.filter(name => {
                const currentSquad = squadService.getSquad(currentEditId);
                return currentSquad && name !== currentSquad.name;
            }) : personSquads;

        return `
            <label style="display: block; margin: 0.5rem 0;">
                <input type="checkbox" value="${person.id}" class="member-checkbox" 
                    ${selectedMembers.includes(person.id) ? 'checked' : ''}>
                ${person.name} (${person.role}) - R$ ${formatCurrency(person.salary)}
                ${otherSquads.length > 0 ? `
                    <span style="color: var(--text-secondary); font-size: 0.85rem;">
                        • Também em: ${otherSquads.join(', ')}
                    </span>
                ` : ''}
            </label>
        `;
    }).join('');
}

function handleSquadSubmit(e) {
    e.preventDefault();

    const checkboxes = document.querySelectorAll('.member-checkbox:checked');
    const members = Array.from(checkboxes).map(cb => cb.value);
    const headId = document.getElementById('head-select').value;

    const formData = {
        name: document.getElementById('name').value,
        icon: document.getElementById('icon').value || null,
        description: document.getElementById('description').value,
        headId: headId || null,
        members: members
    };

    try {
        if (currentEditId) {
            squadService.updateSquad(currentEditId, formData);
        } else {
            squadService.createSquad(formData);
        }
        closeSquadModal();
        renderSquadsPage();
    } catch (error) {
        alert(error.message);
    }
}

function deleteSquad(id) {
    if (confirm('Tem certeza que deseja excluir este squad?')) {
        try {
            squadService.deleteSquad(id);
            renderSquadsPage();
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
