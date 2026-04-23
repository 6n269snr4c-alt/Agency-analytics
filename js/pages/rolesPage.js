// rolesPage.js - Gestão de Funções (Sistema de Pesos COMPLETO)

import storage from '../store/storage.js';
import deliverableTypeService from '../services/deliverableTypeService.js';

let currentEditingRole = null;

export function renderRolesPage() {
    const contentEl = document.getElementById('content');
    
    const roles = storage.getRoles() || [];
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();
    
    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">⚖️ Gestão de Funções</h1>
            <p class="page-subtitle">Configure os pesos dos entregáveis para cada função</p>
        </div>

        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
            <h3 style="margin-top: 0;">💡 Como funciona o sistema de pesos?</h3>
            <p><strong>O peso determina quanto cada tipo de entregável "pesa" no cálculo de custo.</strong></p>
            
            <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                <p style="margin: 0;"><strong>Exemplo prático:</strong></p>
                <p style="margin: 0.5rem 0;">Filmmaker com salário de R$ 3.000:</p>
                <ul style="margin: 0.5rem 0 0.5rem 1.5rem;">
                    <li><strong>5 Vídeos Editados</strong> (peso 5 cada) = 25 pontos</li>
                    <li><strong>80 Clipes</strong> (peso 1 cada) = 80 pontos</li>
                    <li><strong>Total:</strong> 105 pontos</li>
                </ul>
                <p style="margin: 0.5rem 0;"><strong>Custo por ponto:</strong> R$ 3.000 / 105 = R$ 28,57</p>
                <p style="margin: 0;"><strong>Resultado:</strong></p>
                <ul style="margin: 0.5rem 0 0 1.5rem;">
                    <li>1 Vídeo = R$ 28,57 × 5 = <strong>R$ 142,85</strong></li>
                    <li>1 Clipe = R$ 28,57 × 1 = <strong>R$ 28,57</strong></li>
                </ul>
            </div>
        </div>

        <div class="action-bar" style="margin-bottom: 2rem;">
            <button class="btn btn-primary" onclick="window.openRoleModal()">
                + Nova Função
            </button>
        </div>

        ${roles.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">⚖️</div>
                <h3>Nenhuma função cadastrada</h3>
                <p>Comece criando suas primeiras funções (Designer, Filmmaker, etc.)</p>
                <button class="btn btn-primary" onclick="window.openRoleModal()">
                    + Criar Primeira Função
                </button>
            </div>
        ` : `
            <div style="display: grid; gap: 1.5rem;">
                ${roles.map(role => renderRoleCard(role, deliverableTypes)).join('')}
            </div>
        `}

        <!-- Modal de Função -->
        <div id="role-modal" class="modal">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2 id="role-modal-title" class="modal-title">Nova Função</h2>
                    <button class="modal-close" onclick="window.closeRoleModal()">&times;</button>
                </div>
                <form id="role-form">
                    <div class="form-group">
                        <label class="form-label">Nome da Função*</label>
                        <input type="text" class="form-input" id="role-name" required placeholder="Ex: Filmmaker, Designer, Copywriter">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Descrição</label>
                        <textarea class="form-textarea" id="role-description" placeholder="Descreva o que esta função faz..."></textarea>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="window.closeRoleModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal de Configuração de Pesos -->
        <div id="weights-modal" class="modal">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2 id="weights-modal-title" class="modal-title">Configurar Pesos</h2>
                    <button class="modal-close" onclick="window.closeWeightsModal()">&times;</button>
                </div>
                <div id="weights-content" style="padding: 1.5rem;">
                    <!-- Conteúdo será preenchido dinamicamente -->
                </div>
            </div>
        </div>
    `;

    attachRoleHandlers();
}

function renderRoleCard(role, deliverableTypes) {
    const weights = role.deliverableWeights || {};
    const configuredCount = Object.keys(weights).length;
    
    // Descobrir quais tipos de entregáveis usam esta função
    const relevantTypes = deliverableTypes.filter(type => 
        type.roles && type.roles.includes(role.name)
    );
    
    return `
        <div style="background: var(--bg-card, white); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.3rem; color: var(--text);">
                        ${role.name}
                    </h3>
                    ${role.description ? `
                        <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                            ${role.description}
                        </p>
                    ` : ''}
                    <div style="margin-top: 0.75rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                        <span style="color: var(--text-secondary); font-size: 0.9rem;">
                            📦 ${relevantTypes.length} tipo(s) de entregável
                        </span>
                        <span style="color: var(--primary); font-size: 0.9rem; font-weight: 600;">
                            ⚖️ ${configuredCount} peso(s) configurado(s)
                        </span>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button 
                        class="btn btn-primary btn-small" 
                        onclick="window.openWeightsModal('${role.id}')"
                        title="Configurar Pesos"
                    >
                        ⚖️ Pesos
                    </button>
                    <button 
                        class="btn btn-secondary btn-small" 
                        onclick="window.editRole('${role.id}')"
                        title="Editar Função"
                    >
                        ✏️
                    </button>
                    <button 
                        class="btn btn-error btn-small" 
                        onclick="window.deleteRole('${role.id}')"
                        title="Excluir Função"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            ${relevantTypes.length > 0 ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                    <strong style="font-size: 0.9rem; color: var(--text-secondary);">Tipos de Entregável:</strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                        ${relevantTypes.map(type => {
                            const weight = weights[type.id] || type.defaultWeight || 1;
                            const isConfigured = weights.hasOwnProperty(type.id);
                            return `
                                <span style="
                                    display: inline-flex; 
                                    align-items: center; 
                                    gap: 0.5rem;
                                    background: ${isConfigured ? 'var(--primary)' : 'var(--bg-darker)'};
                                    color: ${isConfigured ? 'var(--bg)' : 'var(--text)'};
                                    padding: 0.4rem 0.8rem;
                                    border-radius: 6px;
                                    font-size: 0.85rem;
                                    font-weight: 500;
                                ">
                                    ${type.name}
                                    <span style="
                                        background: ${isConfigured ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'};
                                        padding: 0.2rem 0.5rem;
                                        border-radius: 4px;
                                        font-weight: 700;
                                    ">
                                        ${weight}
                                    </span>
                                </span>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : `
                <div style="margin-top: 1rem; padding: 1rem; background: var(--warning-bg, #fff3cd); border-radius: 6px;">
                    <p style="margin: 0; color: var(--warning-dark, #856404); font-size: 0.9rem;">
                        ⚠️ Nenhum tipo de entregável está associado a esta função. Configure os tipos de entregáveis primeiro.
                    </p>
                </div>
            `}
        </div>
    `;
}

function attachRoleHandlers() {
    const form = document.getElementById('role-form');
    if (form) {
        form.addEventListener('submit', handleRoleSubmit);
    }

    window.openRoleModal = openRoleModal;
    window.closeRoleModal = closeRoleModal;
    window.editRole = editRole;
    window.deleteRole = deleteRole;
    window.openWeightsModal = openWeightsModal;
    window.closeWeightsModal = closeWeightsModal;
    window.saveWeights = saveWeights;
}

function openRoleModal() {
    currentEditingRole = null;
    document.getElementById('role-modal-title').textContent = 'Nova Função';
    document.getElementById('role-form').reset();
    document.getElementById('role-modal').classList.add('active');
}

function closeRoleModal() {
    document.getElementById('role-modal').classList.remove('active');
    currentEditingRole = null;
}

function editRole(roleId) {
    const roles = storage.getRoles() || [];
    const role = roles.find(r => r.id === roleId);
    
    if (!role) return;
    
    currentEditingRole = roleId;
    document.getElementById('role-modal-title').textContent = 'Editar Função';
    document.getElementById('role-name').value = role.name;
    document.getElementById('role-description').value = role.description || '';
    document.getElementById('role-modal').classList.add('active');
}

function deleteRole(roleId) {
    if (!confirm('Tem certeza que deseja excluir esta função? Os pesos configurados serão perdidos.')) {
        return;
    }
    
    let roles = storage.getRoles() || [];
    roles = roles.filter(r => r.id !== roleId);
    storage.saveRoles(roles);
    
    renderRolesPage();
}

function handleRoleSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('role-name').value.trim();
    const description = document.getElementById('role-description').value.trim();
    
    let roles = storage.getRoles() || [];
    
    if (currentEditingRole) {
        // Editar existente
        const index = roles.findIndex(r => r.id === currentEditingRole);
        if (index !== -1) {
            roles[index] = {
                ...roles[index],
                name,
                description
            };
        }
    } else {
        // Criar novo
        const newRole = {
            id: 'role_' + Date.now(),
            name,
            description,
            deliverableWeights: {}
        };
        roles.push(newRole);
    }
    
    storage.saveRoles(roles);
    closeRoleModal();
    renderRolesPage();
}

function openWeightsModal(roleId) {
    const roles = storage.getRoles() || [];
    const role = roles.find(r => r.id === roleId);
    
    if (!role) return;
    
    currentEditingRole = roleId;
    
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();
    const relevantTypes = deliverableTypes.filter(type => 
        type.roles && type.roles.includes(role.name)
    );
    
    document.getElementById('weights-modal-title').textContent = `Configurar Pesos: ${role.name}`;
    
    const weightsContent = document.getElementById('weights-content');
    
    if (relevantTypes.length === 0) {
        weightsContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3>Nenhum tipo de entregável disponível</h3>
                <p style="color: var(--text-secondary);">
                    Esta função não está associada a nenhum tipo de entregável.
                    Cadastre tipos de entregáveis e associe esta função a eles primeiro.
                </p>
            </div>
        `;
    } else {
        weightsContent.innerHTML = `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-darker); border-radius: 8px;">
                <h4 style="margin: 0 0 0.5rem 0;">📏 Escala de Pesos Recomendada:</h4>
                <div style="display: grid; gap: 0.5rem; font-size: 0.9rem;">
                    <div><strong>0.5</strong> - Muito simples (Ex: Stories)</div>
                    <div><strong>1</strong> - Simples (Ex: Post básico, Clipe)</div>
                    <div><strong>2</strong> - Médio (Ex: Carrossel, Roteiro)</div>
                    <div><strong>3</strong> - Complexo (Ex: Gestão de Tráfego)</div>
                    <div><strong>4</strong> - Muito Complexo (Ex: Filmagem)</div>
                    <div><strong>5</strong> - Extremamente Complexo (Ex: Vídeo completo)</div>
                </div>
            </div>

            <form id="weights-form">
                <div style="display: grid; gap: 1rem;">
                    ${relevantTypes.map(type => {
                        const currentWeight = (role.deliverableWeights && role.deliverableWeights[type.id]) || type.defaultWeight || 1;
                        return `
                            <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                    <div style="flex: 1;">
                                        <strong style="font-size: 1.1rem;">${type.name}</strong>
                                        ${type.description ? `
                                            <p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                                                ${type.description}
                                            </p>
                                        ` : ''}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 1rem; align-items: center;">
                                    <label style="flex: 1;">
                                        <span style="font-size: 0.9rem; color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">
                                            Peso (quanto mais complexo, maior o número)
                                        </span>
                                        <input 
                                            type="number" 
                                            class="form-input weight-input" 
                                            data-type-id="${type.id}"
                                            value="${currentWeight}"
                                            min="0.1"
                                            step="0.1"
                                            required
                                            style="font-size: 1.2rem; font-weight: 600; text-align: center;"
                                        >
                                    </label>
                                    <div style="
                                        background: var(--primary);
                                        color: var(--bg);
                                        padding: 1rem;
                                        border-radius: 8px;
                                        font-weight: 700;
                                        font-size: 1.5rem;
                                        min-width: 60px;
                                        text-align: center;
                                    " id="preview-${type.id}">
                                        ${currentWeight}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border); display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="window.closeWeightsModal()">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        💾 Salvar Pesos
                    </button>
                </div>
            </form>
        `;

        // Adicionar preview em tempo real
        document.querySelectorAll('.weight-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const typeId = e.target.dataset.typeId;
                const preview = document.getElementById(`preview-${typeId}`);
                if (preview) {
                    preview.textContent = e.target.value;
                }
            });
        });

        document.getElementById('weights-form').addEventListener('submit', saveWeights);
    }
    
    document.getElementById('weights-modal').classList.add('active');
}

function closeWeightsModal() {
    document.getElementById('weights-modal').classList.remove('active');
    currentEditingRole = null;
}

function saveWeights(e) {
    e.preventDefault();
    
    const roles = storage.getRoles() || [];
    const roleIndex = roles.findIndex(r => r.id === currentEditingRole);
    
    if (roleIndex === -1) return;
    
    const weights = {};
    document.querySelectorAll('.weight-input').forEach(input => {
        const typeId = input.dataset.typeId;
        const value = parseFloat(input.value);
        if (!isNaN(value) && value > 0) {
            weights[typeId] = value;
        }
    });
    
    roles[roleIndex].deliverableWeights = weights;
    storage.saveRoles(roles);
    
    closeWeightsModal();
    renderRolesPage();
    
    // Mostrar mensagem de sucesso
    alert('✅ Pesos salvos com sucesso! Os cálculos de custo agora usarão estes valores.');
}
