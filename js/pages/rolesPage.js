// ============================================
// ROLES PAGE - Gestão de Funções
// Configuração de pesos por tipo de entregável
// ============================================

import storage from '../store/storage.js';

export function renderRolesPage() {
    const roles = storage.getRoles();
    const deliverableTypes = storage.getDeliverableTypes();

    return `
        <div class="roles-page">
            <div class="page-header">
                <h1>⚙️ Gestão de Funções</h1>
                <p class="subtitle">Configure os pesos dos entregáveis para cada função</p>
                <button class="btn btn-primary" onclick="window.rolesPageHandlers.showAddRoleModal()">
                    ➕ Nova Função
                </button>
            </div>

            <div class="info-box">
                <h3>📌 Como funciona o sistema de pesos?</h3>
                <p><strong>O peso determina a complexidade de cada tipo de entregável para uma função específica.</strong></p>
                <p><strong>Exemplo:</strong> Para um Filmmaker:</p>
                <ul>
                    <li>Vídeo Editado completo = <strong>Peso 5</strong> (muito complexo)</li>
                    <li>Clipe (corte) = <strong>Peso 1</strong> (simples)</li>
                </ul>
                <p>Se o Filmmaker tem 5 vídeos editados + 80 clipes:</p>
                <ul>
                    <li>Soma dos pesos = (5 × 5) + (80 × 1) = <strong>105 pontos</strong></li>
                    <li>Custo por ponto = Salário ÷ 105</li>
                </ul>
                <p><strong>Resultado:</strong> Os 80 clipes não pesam tanto quanto os 5 vídeos! ✅</p>
            </div>

            <div class="roles-grid">
                ${roles.map(role => renderRoleCard(role, deliverableTypes)).join('')}
            </div>
        </div>

        <!-- Modal de Adicionar/Editar Função -->
        <div id="roleModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="window.rolesPageHandlers.closeModal()">&times;</span>
                <h2 id="modalTitle">Nova Função</h2>
                <form id="roleForm">
                    <input type="hidden" id="roleId" />
                    
                    <div class="form-group">
                        <label for="roleName">Nome da Função *</label>
                        <input type="text" id="roleName" required 
                               placeholder="Ex: Designer, Filmmaker, Copywriter" />
                    </div>

                    <div class="form-group">
                        <label for="roleDescription">Descrição (opcional)</label>
                        <textarea id="roleDescription" 
                                  placeholder="Descrição breve da função"></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" 
                                onclick="window.rolesPageHandlers.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal de Configurar Pesos -->
        <div id="weightsModal" class="modal">
            <div class="modal-content modal-large">
                <span class="close" onclick="window.rolesPageHandlers.closeWeightsModal()">&times;</span>
                <h2 id="weightsModalTitle">Configurar Pesos</h2>
                <p class="modal-subtitle">Defina o peso de cada tipo de entregável para esta função</p>
                
                <div id="weightsForm"></div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" 
                            onclick="window.rolesPageHandlers.closeWeightsModal()">Cancelar</button>
                    <button type="button" class="btn btn-primary" 
                            onclick="window.rolesPageHandlers.saveWeights()">Salvar Pesos</button>
                </div>
            </div>
        </div>
    `;
}

function renderRoleCard(role, deliverableTypes) {
    // Filtra tipos de entregáveis relevantes para esta função
    const relevantDeliverables = deliverableTypes.filter(dt => 
        dt.roles.includes(role.name)
    );

    const hasWeights = Object.keys(role.deliverableWeights || {}).length > 0;

    return `
        <div class="role-card">
            <div class="role-card-header">
                <h3>${role.name}</h3>
                <div class="role-actions">
                    <button class="btn-icon" 
                            onclick="window.rolesPageHandlers.configureWeights('${role.id}')"
                            title="Configurar Pesos">
                        ⚖️
                    </button>
                    <button class="btn-icon" 
                            onclick="window.rolesPageHandlers.editRole('${role.id}')"
                            title="Editar">
                        ✏️
                    </button>
                    <button class="btn-icon btn-danger" 
                            onclick="window.rolesPageHandlers.deleteRole('${role.id}')"
                            title="Excluir">
                        🗑️
                    </button>
                </div>
            </div>

            ${role.description ? `<p class="role-description">${role.description}</p>` : ''}

            <div class="role-deliverables">
                <h4>Tipos de Entregáveis (${relevantDeliverables.length})</h4>
                ${relevantDeliverables.length === 0 ? 
                    '<p class="empty-state">Nenhum tipo de entregável cadastrado para esta função</p>' :
                    `<ul class="deliverable-list">
                        ${relevantDeliverables.map(dt => {
                            const weight = role.deliverableWeights?.[dt.id] || dt.defaultWeight;
                            return `
                                <li>
                                    <span class="deliverable-name">${dt.name}</span>
                                    <span class="deliverable-weight ${hasWeights ? 'configured' : 'default'}">
                                        Peso: ${weight}
                                        ${!role.deliverableWeights?.[dt.id] ? ' (padrão)' : ''}
                                    </span>
                                </li>
                            `;
                        }).join('')}
                    </ul>`
                }
            </div>

            ${!hasWeights ? `
                <div class="alert alert-warning">
                    ⚠️ Pesos não configurados. Usando valores padrão.
                    <button class="btn btn-sm" onclick="window.rolesPageHandlers.configureWeights('${role.id}')">
                        Configurar Agora
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// ========================================
// EVENT HANDLERS
// ========================================

window.rolesPageHandlers = {
    showAddRoleModal() {
        document.getElementById('modalTitle').textContent = 'Nova Função';
        document.getElementById('roleId').value = '';
        document.getElementById('roleName').value = '';
        document.getElementById('roleDescription').value = '';
        document.getElementById('roleModal').style.display = 'block';
    },

    editRole(roleId) {
        const role = storage.getRoleById(roleId);
        if (!role) return;

        document.getElementById('modalTitle').textContent = 'Editar Função';
        document.getElementById('roleId').value = role.id;
        document.getElementById('roleName').value = role.name;
        document.getElementById('roleDescription').value = role.description || '';
        document.getElementById('roleModal').style.display = 'block';
    },

    closeModal() {
        document.getElementById('roleModal').style.display = 'none';
    },

    configureWeights(roleId) {
        const role = storage.getRoleById(roleId);
        if (!role) return;

        const deliverableTypes = storage.getDeliverableTypes();
        const relevantDeliverables = deliverableTypes.filter(dt => 
            dt.roles.includes(role.name)
        );

        document.getElementById('weightsModalTitle').textContent = `Configurar Pesos - ${role.name}`;
        
        const weightsForm = document.getElementById('weightsForm');
        weightsForm.innerHTML = `
            <div class="weights-grid">
                ${relevantDeliverables.map(dt => {
                    const currentWeight = role.deliverableWeights?.[dt.id] || dt.defaultWeight;
                    return `
                        <div class="weight-input-group">
                            <label for="weight_${dt.id}">
                                <strong>${dt.name}</strong>
                                ${dt.description ? `<span class="help-text">${dt.description}</span>` : ''}
                                <span class="default-weight">Peso padrão: ${dt.defaultWeight}</span>
                            </label>
                            <input type="number" 
                                   id="weight_${dt.id}" 
                                   data-deliverable-id="${dt.id}"
                                   value="${currentWeight}" 
                                   min="0.1" 
                                   step="0.5" 
                                   required />
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        weightsForm.dataset.roleId = roleId;
        document.getElementById('weightsModal').style.display = 'block';
    },

    saveWeights() {
        const weightsForm = document.getElementById('weightsForm');
        const roleId = weightsForm.dataset.roleId;
        
        const role = storage.getRoleById(roleId);
        if (!role) return;

        const inputs = weightsForm.querySelectorAll('input[data-deliverable-id]');
        const newWeights = {};

        inputs.forEach(input => {
            const deliverableId = input.dataset.deliverableId;
            const weight = parseFloat(input.value);
            if (weight > 0) {
                newWeights[deliverableId] = weight;
            }
        });

        storage.updateRole(roleId, { deliverableWeights: newWeights });
        
        this.closeWeightsModal();
        window.router.navigate('roles'); // Recarrega a página
        
        alert('✅ Pesos salvos com sucesso!');
    },

    closeWeightsModal() {
        document.getElementById('weightsModal').style.display = 'none';
    },

    deleteRole(roleId) {
        const role = storage.getRoleById(roleId);
        if (!role) return;

        if (confirm(`Tem certeza que deseja excluir a função "${role.name}"?\n\nIsso não afetará pessoas ou contratos existentes.`)) {
            storage.deleteRole(roleId);
            window.router.navigate('roles');
            alert('✅ Função excluída com sucesso!');
        }
    }
};

// Form submit handler
document.addEventListener('DOMContentLoaded', () => {
    const roleForm = document.getElementById('roleForm');
    if (roleForm) {
        roleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const roleId = document.getElementById('roleId').value;
            const roleName = document.getElementById('roleName').value.trim();
            const roleDescription = document.getElementById('roleDescription').value.trim();

            if (!roleName) {
                alert('❌ Nome da função é obrigatório');
                return;
            }

            const roleData = {
                name: roleName,
                description: roleDescription,
                deliverableWeights: {}
            };

            if (roleId) {
                // Editar
                storage.updateRole(roleId, roleData);
            } else {
                // Adicionar
                storage.addRole(roleData);
            }

            window.rolesPageHandlers.closeModal();
            window.router.navigate('roles');
            alert('✅ Função salva com sucesso!');
        });
    }
});

// Fecha modais ao clicar fora
window.addEventListener('click', (event) => {
    const roleModal = document.getElementById('roleModal');
    const weightsModal = document.getElementById('weightsModal');
    
    if (event.target === roleModal) {
        window.rolesPageHandlers.closeModal();
    }
    if (event.target === weightsModal) {
        window.rolesPageHandlers.closeWeightsModal();
    }
});
