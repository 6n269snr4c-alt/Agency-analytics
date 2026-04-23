// contractsPage.js - VERSÃO CORRIGIDA (Botão + Indicador de Erro)

import contractService from '../services/contractService.js';
import squadService from '../services/squadService.js';
import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';
import deliverableTypeService from '../services/deliverableTypeService.js';
import storage from '../store/storage.js';
import { renderPeriodSelector } from '../components/periodSelector.js';

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

        ${renderPeriodSelector()}

        <div class="action-bar">
            <div class="action-bar-left">
                <button class="btn btn-primary" onclick="window.openContractModal()">
                    + Novo Contrato
                </button>
                <button class="btn btn-secondary" onclick="window.exportContracts()">
                    📥 Exportar Dados
                </button>
            </div>
            <div class="action-bar-right">
                <input 
                    type="text" 
                    class="form-input" 
                    id="contract-search" 
                    placeholder="🔍 Buscar contrato..."
                    style="max-width: 300px;"
                    oninput="window.filterContracts()"
                >
            </div>
        </div>

        <div id="contracts-list">
            ${renderContractsList(contracts)}
        </div>

        <div id="contract-modal" class="modal">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2 id="modal-title" class="modal-title">Novo Contrato</h2>
                    <button class="modal-close" onclick="window.closeContractModal()">&times;</button>
                </div>
                <form id="contract-form">
                    <div class="form-group">
                        <label class="form-label">Cliente*</label>
                        <input type="text" class="form-input" id="client" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Valor do Contrato (R$)*</label>
                        <input type="number" class="form-input" id="value" step="0.01" min="0" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Entregáveis</label>
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                            <select class="form-select" id="deliverable-type-select" style="flex: 1;">
                                <option value="">Selecione um tipo</option>
                                ${deliverableTypes.map(type => 
                                    `<option value="${type.id}">${type.name}</option>`
                                ).join('')}
                            </select>
                            <input 
                                type="number" 
                                class="form-input" 
                                id="deliverable-qty" 
                                placeholder="Qtd" 
                                min="1" 
                                style="width: 100px;"
                            >
                            <button type="button" class="btn btn-primary" onclick="window.addDeliverable()">
                                + Adicionar
                            </button>
                        </div>
                        <div id="deliverables-container"></div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Squad Responsável</label>
                        <select class="form-select" id="squad-tag">
                            <option value="">Nenhum</option>
                            ${squads.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Equipe do Contrato</label>
                        <div id="team-assignment">
                            ${renderTeamAssignment(people)}
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Observações</label>
                        <textarea class="form-textarea" id="notes"></textarea>
                    </div>

                    <div id="form-validation-warnings"></div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="window.closeContractModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="breakdown-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="breakdown-title">Detalhamento de Custo</h2>
                    <button class="modal-close" onclick="window.closeBreakdownModal()">&times;</button>
                </div>
                <div id="breakdown-content" style="padding: 1.5rem;"></div>
            </div>
        </div>

        <div id="details-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="details-title">Detalhes do Contrato</h2>
                    <button class="modal-close" onclick="window.closeDetailsModal()">&times;</button>
                </div>
                <div id="details-content" style="padding: 1.5rem;"></div>
            </div>
        </div>

        <!-- MODAL DE DEBUG (NOVO) -->
        <div id="debug-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">🐛 Debug do Cálculo</h2>
                    <button class="modal-close" onclick="window.closeDebugModal()">&times;</button>
                </div>
                <div id="debug-content" style="padding: 1.5rem; font-family: monospace; font-size: 0.9rem;"></div>
            </div>
        </div>
    `;

    attachContractHandlers();
    renderDeliverables();
}

let sortColumn = 'client';
let sortDirection = 'asc';

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

    const contractsData = contracts.map(contract => {
        const roi = analyticsService.getContractROI(contract.id);
        const safeRoi = roi || { cost: 0, profit: 0, margin: 0 };
        
        const assignedPeople = contract.assignedPeople || [];
        const squad = contract.squadTag ? squadService.getSquad(contract.squadTag) : null;
        const warnings = validateContractConsistency(contract);
        
        // ⚠️ DETECTAR ERRO DE CÁLCULO
        const hasCalculationError = assignedPeople.length > 0 && 
                                    Object.keys(contract.deliverables || {}).length > 0 && 
                                    safeRoi.cost === 0;
        
        return {
            contract,
            roi: safeRoi,
            assignedPeople,
            squad,
            warnings,
            hasCalculationError,
            clientName: contract.client.toLowerCase(),
            cost: safeRoi.cost,
            squadName: squad ? squad.name.toLowerCase() : 'zzz',
            value: contract.value,
            profit: safeRoi.profit,
            margin: safeRoi.margin,
            peopleCount: assignedPeople.length,
            deliverablesCount: Object.keys(contract.deliverables || {}).length
        };
    });

    contractsData.sort((a, b) => {
        let comparison = 0;
        
        switch(sortColumn) {
            case 'client':
                comparison = a.clientName.localeCompare(b.clientName);
                break;
            case 'squad':
                comparison = a.squadName.localeCompare(b.squadName);
                break;
            case 'value':
            case 'cost':
            case 'profit':
            case 'margin':
            case 'peopleCount':
            case 'deliverablesCount':
                comparison = a[sortColumn] - b[sortColumn];
                break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    return `
        <style>
            #contracts-list .table-container {
                overflow-x: auto;
                border-radius: 8px;
                border: 1px solid var(--border);
            }
            
            #contracts-list table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                min-width: 1200px;
            }
            
            #contracts-list th,
            #contracts-list td {
                padding: 1rem;
                text-align: left;
                border-bottom: 1px solid var(--border);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            #contracts-list th:nth-child(1), #contracts-list td:nth-child(1) { width: 200px; }
            #contracts-list th:nth-child(2), #contracts-list td:nth-child(2) { width: 120px; }
            #contracts-list th:nth-child(3), #contracts-list td:nth-child(3) { width: 130px; }
            #contracts-list th:nth-child(4), #contracts-list td:nth-child(4) { width: 130px; }
            #contracts-list th:nth-child(5), #contracts-list td:nth-child(5) { width: 130px; }
            #contracts-list th:nth-child(6), #contracts-list td:nth-child(6) { width: 100px; }
            #contracts-list th:nth-child(7), #contracts-list td:nth-child(7) { width: 120px; text-align: center; }
            #contracts-list th:nth-child(8), #contracts-list td:nth-child(8) { width: 120px; text-align: center; }
            
            #contracts-list thead {
                background: var(--bg-darker);
                position: sticky;
                top: 0;
                z-index: 10;
            }
            
            #contracts-list tbody tr:hover {
                background: var(--bg-darker);
            }
            
            .sort-btn {
                background: none;
                border: none;
                color: var(--text);
                cursor: pointer;
                font-weight: 600;
                padding: 0;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }
            
            .sort-btn:hover {
                color: var(--primary);
            }

            /* ✅ BOTÃO CORRIGIDO - SEM VERDE */
            .details-btn {
                background: var(--bg-darker);
                color: var(--text);
                border: 1px solid var(--border);
                padding: 0.5rem 0.75rem;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                font-size: 0.9rem;
                transition: all 0.2s;
            }

            .details-btn:hover {
                background: var(--primary);
                color: var(--bg);
                border-color: var(--primary);
                transform: translateY(-1px);
            }

            /* ⚠️ INDICADOR DE ERRO */
            .error-indicator {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                background: #dc3545;
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.85rem;
                font-weight: 600;
                animation: pulse 2s infinite;
                cursor: pointer;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            .warning-indicator {
                display: inline-block;
                width: 8px;
                height: 8px;
                background: var(--warning, #ffc107);
                border-radius: 50%;
                margin-left: 0.5rem;
            }
        </style>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th><button class="sort-btn" onclick="window.sortContractsBy('client')">
                            Cliente ${sortColumn === 'client' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button></th>
                        <th><button class="sort-btn" onclick="window.sortContractsBy('squad')">
                            Squad ${sortColumn === 'squad' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button></th>
                        <th><button class="sort-btn" onclick="window.sortContractsBy('value')">
                            Valor ${sortColumn === 'value' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button></th>
                        <th><button class="sort-btn" onclick="window.sortContractsBy('cost')">
                            Custo ${sortColumn === 'cost' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button></th>
                        <th><button class="sort-btn" onclick="window.sortContractsBy('profit')">
                            Lucro ${sortColumn === 'profit' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button></th>
                        <th><button class="sort-btn" onclick="window.sortContractsBy('margin')">
                            Margem ${sortColumn === 'margin' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button></th>
                        <th style="text-align: center;">Detalhes</th>
                        <th style="text-align: center;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${contractsData.map(({contract, roi, assignedPeople, squad, warnings, hasCalculationError}) => `
                        <tr>
                            <td title="${contract.client}">
                                <strong>${contract.client}</strong>
                                ${warnings.length > 0 ? '<span class="warning-indicator" title="Há avisos"></span>' : ''}
                                ${hasCalculationError ? '<br><span class="error-indicator" onclick="window.showDebug(\''+contract.id+'\')">🐛 ERRO DE CÁLCULO</span>' : ''}
                            </td>
                            <td title="${squad ? squad.name : '-'}">${squad ? squad.name : '-'}</td>
                            <td>R$ ${formatCurrency(contract.value)}</td>
                            <td>R$ ${formatCurrency(roi.cost)}</td>
                            <td>
                                <span class="badge ${roi.profit >= 0 ? 'badge-success' : 'badge-error'}">
                                    R$ ${formatCurrency(roi.profit)}
                                </span>
                            </td>
                            <td>
                                <span class="badge ${roi.margin >= 30 ? 'badge-success' : roi.margin >= 15 ? 'badge-warning' : 'badge-error'}">
                                    ${roi.margin.toFixed(1)}%
                                </span>
                            </td>
                            <td style="text-align: center;">
                                <button class="details-btn" onclick="window.showContractDetails('${contract.id}')">
                                    👥 ${assignedPeople.length} | 📦 ${Object.keys(contract.deliverables || {}).length}
                                </button>
                            </td>
                            <td>
                                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                                    <button class="btn btn-small btn-secondary" onclick="window.editContract('${contract.id}')" title="Editar">✏️</button>
                                    <button class="btn btn-small btn-error" onclick="window.deleteContract('${contract.id}')" title="Excluir">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showDebug(contractId) {
    const contract = contractService.getContract(contractId);
    const people = (contract.assignedPeople || []).map(id => personService.getPerson(id)).filter(Boolean);
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();
    
    let debugHtml = `
        <div style="background: #1a1a1a; color: #00ff41; padding: 1.5rem; border-radius: 4px; line-height: 1.8;">
            <h3 style="color: #ff4444; margin-top: 0;">🐛 DEBUG: ${contract.client}</h3>
            
            <div style="margin: 1rem 0;">
                <strong style="color: #ffaa00;">PESSOAS ATRIBUÍDAS: ${people.length}</strong><br>
                ${people.map(p => `- ${p.name} (${p.role}) - R$ ${formatCurrency(p.salary)}`).join('<br>')}
            </div>

            <div style="margin: 1rem 0;">
                <strong style="color: #ffaa00;">ENTREGÁVEIS: ${Object.keys(contract.deliverables || {}).length}</strong><br>
                ${Object.entries(contract.deliverables || {}).map(([typeId, qty]) => {
                    const type = deliverableTypes.find(t => t.id === typeId);
                    return `- ${type ? type.name : typeId}: ${qty}x`;
                }).join('<br>')}
            </div>

            <div style="margin: 1rem 0; padding: 1rem; background: #2a2a2a; border-left: 3px solid #ff4444;">
                <strong style="color: #ff4444;">❌ PROBLEMA DETECTADO:</strong><br>
                Há pessoas E entregáveis, mas o custo está ZERO.<br><br>
                
                <strong>Possíveis causas:</strong><br>
                1. Sistema de pesos NÃO está ativo no analyticsService.js<br>
                2. Pessoa não tem entregáveis cadastrados no perfil<br>
                3. Entregável não tem a role da pessoa configurada<br><br>

                <strong style="color: #00ff41;">✅ SOLUÇÃO:</strong><br>
                Vou corrigir o analyticsService.js para usar o sistema de pesos corretamente.
            </div>
        </div>
    `;
    
    document.getElementById('debug-content').innerHTML = debugHtml;
    document.getElementById('debug-modal').classList.add('active');
}

function closeDebugModal() {
    document.getElementById('debug-modal').classList.remove('active');
}

function showContractDetails(contractId) {
    const contract = contractService.getContract(contractId);
    const assignedPeople = (contract.assignedPeople || []).map(id => personService.getPerson(id)).filter(Boolean);
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();
    
    document.getElementById('details-title').textContent = `${contract.client} - Equipe e Entregáveis`;
    
    document.getElementById('details-content').innerHTML = `
        <div style="display: grid; gap: 2rem;">
            <div>
                <h3 style="margin: 0 0 1rem 0; color: var(--primary);">👥 Equipe (${assignedPeople.length})</h3>
                ${assignedPeople.length > 0 ? `
                    <div style="display: grid; gap: 0.75rem;">
                        ${assignedPeople.map(person => `
                            <div style="background: var(--bg-darker); padding: 1rem; border-radius: 6px; border: 1px solid var(--border);">
                                <strong>${person.name}</strong>
                                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">
                                    ${person.role} • R$ ${formatCurrency(person.salary)}/mês
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p style="color: var(--text-secondary);">Nenhuma pessoa atribuída</p>'}
            </div>

            <div>
                <h3 style="margin: 0 0 1rem 0; color: var(--primary);">📦 Entregáveis (${Object.keys(contract.deliverables || {}).length})</h3>
                ${Object.keys(contract.deliverables || {}).length > 0 ? `
                    <div style="display: grid; gap: 0.75rem;">
                        ${Object.entries(contract.deliverables).map(([typeId, qty]) => {
                            const type = deliverableTypes.find(dt => dt.id === typeId);
                            return `
                                <div style="background: var(--bg-darker); padding: 1rem; border-radius: 6px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong>${type ? type.name : 'Desconhecido'}</strong>
                                        <div style="color: var(--text-secondary); font-size: 0.9rem;">
                                            ${type ? 'Requer: ' + type.roles.join(', ') : ''}
                                        </div>
                                    </div>
                                    <div style="background: var(--primary); color: var(--bg); padding: 0.5rem 1rem; border-radius: 4px; font-weight: bold;">
                                        ${qty}x
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : '<p style="color: var(--text-secondary);">Nenhum entregável</p>'}
            </div>
        </div>
    `;
    
    document.getElementById('details-modal').classList.add('active');
}

function closeDetailsModal() {
    document.getElementById('details-modal').classList.remove('active');
}

function renderTeamAssignment(people) {
    const peopleByRole = {};
    people.forEach(person => {
        if (!peopleByRole[person.role]) peopleByRole[person.role] = [];
        peopleByRole[person.role].push(person);
    });

    return `
        <div style="display: grid; gap: 1rem;">
            ${Object.entries(peopleByRole).map(([role, rolePeople]) => `
                <div style="background: var(--bg-darker); padding: 1rem; border-radius: 4px; border: 1px solid var(--border);">
                    <h4 style="margin: 0 0 0.75rem 0; color: var(--primary); font-size: 0.95rem;">${role}</h4>
                    <div style="display: grid; gap: 0.5rem;">
                        ${rolePeople.map(person => `
                            <label style="display: flex; align-items: center; padding: 0.5rem; background: var(--bg); border-radius: 4px; cursor: pointer;">
                                <input type="checkbox" class="person-checkbox" value="${person.id}" style="margin-right: 0.75rem;">
                                <strong>${person.name}</strong>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function attachContractHandlers() {
    document.getElementById('contract-form').addEventListener('submit', handleContractSubmit);
    
    setTimeout(() => {
        document.querySelectorAll('.person-checkbox').forEach(cb => {
            cb.addEventListener('change', updateFormValidationWarnings);
        });
    }, 100);

    window.openContractModal = openContractModal;
    window.closeContractModal = closeContractModal;
    window.editContract = editContract;
    window.deleteContract = deleteContract;
    window.addDeliverable = addDeliverable;
    window.removeDeliverable = removeDeliverable;
    window.exportContracts = exportContracts;
    window.showContractBreakdown = showContractBreakdown;
    window.closeBreakdownModal = closeBreakdownModal;
    window.showContractDetails = showContractDetails;
    window.closeDetailsModal = closeDetailsModal;
    window.showDebug = showDebug;
    window.closeDebugModal = closeDebugModal;
    window.filterContracts = filterContracts;
    window.sortContractsBy = sortContractsBy;
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

function showContractBreakdown(contractId) {
    const contract = contractService.getContract(contractId);
    const roi = analyticsService.getContractROI(contractId);
    
    if (!roi) {
        alert('ROI não calculado. Verifique pessoas/entregáveis.');
        return;
    }
    
    document.getElementById('breakdown-title').textContent = `${contract.client} - Custo`;
    document.getElementById('breakdown-content').innerHTML = `
        <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; color: var(--primary);">Receita</h3>
            <div style="font-size: 1.5rem; font-weight: bold;">R$ ${formatCurrency(contract.value)}</div>
        </div>
        <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; color: var(--primary);">Custo</h3>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">R$ ${formatCurrency(roi.cost)}</div>
        </div>
        <div style="background: var(--bg-darker); border: 1px solid ${roi.profit > 0 ? 'var(--success)' : 'var(--error)'}; padding: 1.5rem; border-radius: 8px;">
            <h3 style="color: ${roi.profit > 0 ? 'var(--success)' : 'var(--error)'}; margin: 0 0 1rem 0;">
                ${roi.profit > 0 ? '✅ Lucro' : '⚠️ Prejuízo'}
            </h3>
            <div style="font-size: 1.8rem; font-weight: bold; color: ${roi.profit > 0 ? 'var(--success)' : 'var(--error)'};">
                R$ ${formatCurrency(roi.profit)}
            </div>
            <div style="margin-top: 0.5rem; font-size: 1.1rem;">Margem: ${roi.margin.toFixed(1)}%</div>
        </div>
    `;
    document.getElementById('breakdown-modal').classList.add('active');
}

function closeBreakdownModal() {
    document.getElementById('breakdown-modal').classList.remove('active');
}

function sortContractsBy(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    renderContractsPage();
}

function filterContracts() {
    const searchTerm = document.getElementById('contract-search').value.toLowerCase();
    document.querySelectorAll('#contracts-list tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
    });
}

function exportContracts() {
    const contracts = contractService.getAllContracts();
    const dataBlob = new Blob([JSON.stringify(contracts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contratos_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function updateFormValidationWarnings() {
    const warningsContainer = document.getElementById('form-validation-warnings');
    if (!warningsContainer) return;

    const selectedPeople = Array.from(document.querySelectorAll('.person-checkbox:checked')).map(cb => cb.value);
    
    if (selectedPeople.length === 0 || Object.keys(deliverables).length === 0) {
        warningsContainer.innerHTML = '';
        return;
    }

    const warnings = validateContractConsistency({ assignedPeople: selectedPeople, deliverables });
    
    if (warnings.length > 0) {
        warningsContainer.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 1rem; margin-top: 1rem;">
                <strong style="color: #856404;">⚠️ Avisos:</strong>
                <ul style="margin: 0.5rem 0 0 1.5rem; color: #856404;">
                    ${warnings.map(w => `<li>${w.message}</li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        warningsContainer.innerHTML = '';
    }
}

function validateContractConsistency(contract) {
    const warnings = [];
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();
    
    const rolesNeeded = new Set();
    if (contract.deliverables) {
        Object.keys(contract.deliverables).forEach(typeId => {
            const type = deliverableTypes.find(dt => dt.id === typeId);
            if (type && type.roles) {
                type.roles.forEach(role => rolesNeeded.add(role));
            }
        });
    }
    
    const rolesAssigned = new Set();
    if (contract.assignedPeople) {
        contract.assignedPeople.forEach(personId => {
            const person = personService.getPerson(personId);
            if (person) rolesAssigned.add(person.role);
        });
    }
    
    rolesNeeded.forEach(role => {
        if (!rolesAssigned.has(role)) {
            warnings.push({ type: 'missing_person', role, message: `Falta ${role}` });
        }
    });
    
    return warnings;
}

function editContract(id) {
    currentEditId = id;
    const contract = contractService.getContract(id);
    
    document.getElementById('client').value = contract.client;
    document.getElementById('value').value = contract.value;
    document.getElementById('notes').value = contract.notes || '';
    
    deliverables = { ...contract.deliverables };
    renderDeliverables();

    if (contract.squadTag) {
        document.getElementById('squad-tag').value = contract.squadTag;
    }

    if (contract.assignedPeople && contract.assignedPeople.length > 0) {
        setTimeout(() => {
            contract.assignedPeople.forEach(personId => {
                const checkbox = document.querySelector(`.person-checkbox[value="${personId}"]`);
                if (checkbox) checkbox.checked = true;
            });
            updateFormValidationWarnings();
        }, 100);
    }

    document.getElementById('modal-title').textContent = 'Editar Contrato';
    document.getElementById('contract-modal').classList.add('active');
}

function handleContractSubmit(e) {
    e.preventDefault();

    const assignedPeople = Array.from(document.querySelectorAll('.person-checkbox:checked')).map(cb => cb.value);
    const squadTagValue = document.getElementById('squad-tag').value;

    const formData = {
        client: document.getElementById('client').value,
        value: parseFloat(document.getElementById('value').value),
        deliverables,
        notes: document.getElementById('notes').value,
        assignedPeople,
        squadTag: squadTagValue || null
    };

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
    if (confirm('Excluir este contrato?')) {
        contractService.deleteContract(id);
        renderContractsPage();
    }
}

function addDeliverable() {
    const typeSelect = document.getElementById('deliverable-type-select');
    const typeId = typeSelect?.value;
    const qty = parseInt(document.getElementById('deliverable-qty').value);

    if (!typeId) {
        alert('Selecione um tipo');
        return;
    }

    if (!qty || qty < 1) {
        alert('Quantidade inválida');
        return;
    }

    deliverables[typeId] = qty;
    
    if (typeSelect) typeSelect.value = '';
    document.getElementById('deliverable-qty').value = '';
    renderDeliverables();
    updateFormValidationWarnings();
}

function removeDeliverable(typeId) {
    delete deliverables[typeId];
    renderDeliverables();
    updateFormValidationWarnings();
}

function renderDeliverables() {
    const container = document.getElementById('deliverables-container');
    if (!container) return;

    if (Object.keys(deliverables).length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Nenhum entregável</p>';
        return;
    }

    container.innerHTML = `
        <div class="tag-container">
            ${Object.entries(deliverables).map(([typeId, qty]) => {
                const type = deliverableTypeService.getDeliverableType(typeId);
                return `
                    <div class="tag tag-large">
                        <div style="flex: 1;">
                            <strong>${type ? type.name : 'Desconhecido'}</strong>
                            <span style="font-size: 0.85rem; color: var(--text-secondary);">
                                ${qty}x | ${type ? type.roles.join(', ') : ''}
                            </span>
                        </div>
                        <button type="button" onclick="window.removeDeliverable('${typeId}')" style="background: none; border: none; color: var(--error); cursor: pointer; font-size: 1.2rem;">×</button>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}
