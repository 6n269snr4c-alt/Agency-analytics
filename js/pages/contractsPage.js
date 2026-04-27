// contractsPage.js - COM BREAKDOWN DETALHADO

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
                        <label class="form-label">Valor (R$) *</label>
                        <input type="number" class="form-input" id="value" step="0.01" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Entregáveis</label>
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <select class="form-select" id="deliverable-type-select" style="flex: 1;">
                                <option value="">Selecione tipo</option>
                                ${deliverableTypes.map(dt => `
                                    <option value="${dt.id}">${dt.name}</option>
                                `).join('')}
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
                            ${renderTeamAssignment(people, squads)}
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

        <!-- MODAL DE BREAKDOWN DETALHADO -->
        <div id="breakdown-modal" class="modal">
            <div class="modal-content" style="max-width: 800px;">
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
            squadName: squad ? squad.name.toLowerCase() : '',
            value: contract.value
        };
    });

    contractsData.sort((a, b) => {
        let comparison = 0;
        
        if (sortColumn === 'client') {
            comparison = a.clientName.localeCompare(b.clientName);
        } else if (sortColumn === 'squad') {
            comparison = a.squadName.localeCompare(b.squadName);
        } else {
            comparison = a[sortColumn] - b[sortColumn];
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    return `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th onclick="window.sortContractsBy('client')" style="cursor: pointer;">
                            Cliente ${sortColumn === 'client' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th onclick="window.sortContractsBy('squad')" style="cursor: pointer;">
                            Squad ${sortColumn === 'squad' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th onclick="window.sortContractsBy('value')" style="cursor: pointer;">
                            Valor ${sortColumn === 'value' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th onclick="window.sortContractsBy('cost')" style="cursor: pointer;">
                            Custo ${sortColumn === 'cost' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th>Lucro</th>
                        <th>Margem</th>
                        <th style="text-align: center;">Detalhes</th>
                        <th style="text-align: center;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${contractsData.map(({ contract, roi, assignedPeople, squad }) => `
                        <tr>
                            <td><strong>${contract.client}</strong></td>
                            <td>${squad ? squad.name : '-'}</td>
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
                                <button class="btn btn-small btn-primary" onclick="window.showContractBreakdown('${contract.id}')" title="Ver Cálculo Detalhado">
                                    🔍 Ver Cálculo
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

// BREAKDOWN DETALHADO DO CONTRATO
function showContractBreakdown(contractId) {
    const contract = contractService.getContract(contractId);
    const roi = analyticsService.getContractROI(contractId);
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();
    
    if (!roi) {
        alert('ROI não calculado. Verifique pessoas/entregáveis.');
        return;
    }
    
    document.getElementById('breakdown-title').textContent = `${contract.client} - Cálculo Detalhado`;
    
    // Entregáveis do contrato
    let deliverablesHtml = '';
    if (contract.deliverables && Object.keys(contract.deliverables).length > 0) {
        deliverablesHtml = `
            <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; color: var(--fast-green); font-size: 1rem; text-transform: uppercase;">📦 Entregáveis do Contrato</h3>
                <div style="display: grid; gap: 0.5rem;">
                    ${Object.entries(contract.deliverables).map(([typeId, qty]) => {
                        const type = deliverableTypes.find(dt => dt.id === typeId);
                        return `
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                                <span>${type ? type.name : 'Desconhecido'}</span>
                                <strong>${qty}x</strong>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // Breakdown por pessoa
    let peopleBreakdownHtml = '';
    if (roi.costBreakdown && roi.costBreakdown.length > 0) {
        peopleBreakdownHtml = `
            <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; color: var(--fast-green); font-size: 1rem; text-transform: uppercase;">👥 Custo por Pessoa</h3>
                ${roi.costBreakdown.map(person => {
                    const personData = personService.getPerson(person.personId);
                    if (!personData && !person.isHead) return '';
                    
                    if (person.isHead) {
                        // Head Executivo
                        return `
                            <div style="background: var(--bg); padding: 1rem; border-radius: 6px; margin-bottom: 1rem; border-left: 3px solid var(--fast-green);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <strong style="color: var(--fast-green);">${person.name}</strong>
                                    <span class="badge badge-success">${person.role}</span>
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                                    ├─ Salário: R$ ${formatCurrency(personData ? personData.salary : 0)}/mês<br>
                                    ├─ Estratégia e Gestão do Squad<br>
                                    ├─ Custo rateado entre clientes do squad<br>
                                    └─ <strong style="color: var(--fast-green);">CUSTO NESTE CONTRATO: R$ ${formatCurrency(person.totalCost)}</strong>
                                </div>
                            </div>
                        `;
                    } else {
                        // Pessoa normal
                        const totalPoints = analyticsService.getPersonTotalWeightedDeliverables(person.personId);
                        return `
                            <div style="background: var(--bg); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <strong>${person.name}</strong>
                                    <span class="badge badge-success">${person.role}</span>
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                                    ├─ Salário: R$ ${formatCurrency(personData.salary)}/mês<br>
                                    ├─ Pontos neste contrato: ${person.weightedPointsInContract.toFixed(1)} pontos<br>
                                    ├─ Total de pontos (todos contratos): ${totalPoints.toFixed(1)} pontos<br>
                                    ├─ Custo por ponto: R$ ${formatCurrency(personData.salary)} ÷ ${totalPoints.toFixed(1)} = R$ ${formatCurrency(person.costPerWeightedPoint)}/ponto<br>
                                    └─ <strong style="color: var(--fast-green);">CUSTO NESTE CONTRATO: ${person.weightedPointsInContract.toFixed(1)} × R$ ${formatCurrency(person.costPerWeightedPoint)} = R$ ${formatCurrency(person.totalCost)}</strong>
                                </div>
                            </div>
                        `;
                    }
                }).join('')}
            </div>
        `;
    }
    
    // Resumo final
    const summaryHtml = `
        <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; border: 2px solid ${roi.profit > 0 ? 'var(--fast-green)' : 'var(--error)'};">
            <h3 style="color: ${roi.profit > 0 ? 'var(--fast-green)' : 'var(--error)'}; margin: 0 0 1rem 0; font-size: 1rem; text-transform: uppercase;">
                ${roi.profit > 0 ? '✅ Resumo Financeiro' : '⚠️ Resumo Financeiro'}
            </h3>
            <div style="display: grid; gap: 0.75rem;">
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>💵 Receita:</span>
                    <strong>R$ ${formatCurrency(contract.value)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>💰 Custo Total:</span>
                    <strong style="color: var(--error);">R$ ${formatCurrency(roi.cost)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px; border: 1px solid ${roi.profit > 0 ? 'var(--fast-green)' : 'var(--error)'};">
                    <span style="font-weight: 700;">${roi.profit > 0 ? '✅ Lucro:' : '⚠️ Prejuízo:'}</span>
                    <strong style="color: ${roi.profit > 0 ? 'var(--fast-green)' : 'var(--error)'}; font-size: 1.2rem;">R$ ${formatCurrency(roi.profit)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>📊 Margem:</span>
                    <strong style="color: ${roi.margin >= 30 ? 'var(--fast-green)' : roi.margin >= 15 ? 'var(--warning)' : 'var(--error)'};">${roi.margin.toFixed(1)}%</strong>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('breakdown-content').innerHTML = deliverablesHtml + peopleBreakdownHtml + summaryHtml;
    document.getElementById('breakdown-modal').classList.add('active');
}

function closeBreakdownModal() {
    document.getElementById('breakdown-modal').classList.remove('active');
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
                    return `- ${type ? type.name : 'Desconhecido'}: ${qty}x`;
                }).join('<br>')}
            </div>

            <div style="margin: 1rem 0; padding: 1rem; background: #2a2a2a; border-left: 3px solid #ff4444;">
                <strong style="color: #ff4444;">❌ PROBLEMA DETECTADO:</strong><br>
                Há pessoas E entregáveis, mas o custo está ZERO.
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

function renderTeamAssignment(people, squads) {
    const availablePeople = people.filter(person => {
        const isHead = squads.some(squad => squad.headId === person.id);
        return !isHead;
    });
    
    const peopleByRole = {};
    availablePeople.forEach(person => {
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
