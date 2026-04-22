// contractsPage.js - Contracts management page (VISUAL MELHORADO)

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

        <!-- Period Selector -->
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

        <!-- Contracts List -->
        <div id="contracts-list">
            ${renderContractsList(contracts)}
        </div>

        <!-- Modal -->
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
                        <label class="form-label">Squad Responsável (Tag Organizacional)</label>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                            Marque qual squad é responsável por este contrato (para análises e relatórios)
                        </p>
                        <select class="form-select" id="squad-tag">
                            <option value="">Nenhum</option>
                            ${squads.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Equipe do Contrato</label>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                            Selecione as pessoas específicas que trabalharão neste contrato
                        </p>
                        
                        <div id="team-assignment">
                            ${renderTeamAssignment(people)}
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Observações</label>
                        <textarea class="form-textarea" id="notes"></textarea>
                    </div>

                    <!-- Validation Warnings -->
                    <div id="form-validation-warnings"></div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="window.closeContractModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Breakdown Modal -->
        <div id="breakdown-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="breakdown-title">Detalhamento de Custo</h2>
                    <button class="modal-close" onclick="window.closeBreakdownModal()">&times;</button>
                </div>
                <div id="breakdown-content" style="padding: 1.5rem;">
                    <!-- Content populated by JS -->
                </div>
            </div>
        </div>

        <!-- Details Modal (NOVO) -->
        <div id="details-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="details-title">Detalhes do Contrato</h2>
                    <button class="modal-close" onclick="window.closeDetailsModal()">&times;</button>
                </div>
                <div id="details-content" style="padding: 1.5rem;">
                    <!-- Content populated by JS -->
                </div>
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

    // Prepare data with calculated values
    const contractsData = contracts.map(contract => {
        const roi = analyticsService.getContractROI(contract.id);
        const safeRoi = roi || { cost: 0, profit: 0, margin: 0 };
        
        const assignedPeople = contract.assignedPeople || [];
        const squad = contract.squadTag ? squadService.getSquad(contract.squadTag) : null;
        const warnings = validateContractConsistency(contract);
        
        return {
            contract,
            roi: safeRoi,
            assignedPeople,
            squad,
            warnings,
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

    // Sort data
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
            /* Estilos para tabela de contratos - UMA LINHA POR CONTRATO */
            #contracts-list .table-container {
                overflow-x: auto;
                border-radius: 8px;
                border: 1px solid var(--border);
            }
            
            #contracts-list table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed; /* FORÇA larguras fixas */
                min-width: 1200px; /* Largura mínima para scroll horizontal */
            }
            
            #contracts-list th,
            #contracts-list td {
                padding: 1rem;
                text-align: left;
                border-bottom: 1px solid var(--border);
                white-space: nowrap; /* IMPEDE quebra de linha */
                overflow: hidden;
                text-overflow: ellipsis; /* ... quando texto for muito grande */
            }
            
            /* Larguras fixas por coluna */
            #contracts-list th:nth-child(1), /* Cliente */
            #contracts-list td:nth-child(1) { width: 200px; }
            
            #contracts-list th:nth-child(2), /* Squad */
            #contracts-list td:nth-child(2) { width: 120px; }
            
            #contracts-list th:nth-child(3), /* Valor */
            #contracts-list td:nth-child(3) { width: 130px; }
            
            #contracts-list th:nth-child(4), /* Custo */
            #contracts-list td:nth-child(4) { width: 130px; }
            
            #contracts-list th:nth-child(5), /* Lucro */
            #contracts-list td:nth-child(5) { width: 130px; }
            
            #contracts-list th:nth-child(6), /* Margem */
            #contracts-list td:nth-child(6) { width: 100px; }
            
            #contracts-list th:nth-child(7), /* Detalhes */
            #contracts-list td:nth-child(7) { width: 100px; text-align: center; }
            
            #contracts-list th:nth-child(8), /* Ações */
            #contracts-list td:nth-child(8) { width: 120px; text-align: center; }
            
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
                white-space: nowrap;
            }
            
            .sort-btn:hover {
                color: var(--primary);
            }

            .details-btn {
                background: var(--primary);
                color: var(--bg);
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
                white-space: nowrap;
            }

            .details-btn:hover {
                opacity: 0.8;
                transform: translateY(-1px);
            }

            .warning-indicator {
                display: inline-block;
                width: 8px;
                height: 8px;
                background: var(--warning, #ffc107);
                border-radius: 50%;
                margin-left: 0.5rem;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        </style>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>
                            <button class="sort-btn" onclick="window.sortContractsBy('client')">
                                Cliente ${sortColumn === 'client' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                            </button>
                        </th>
                        <th>
                            <button class="sort-btn" onclick="window.sortContractsBy('squad')">
                                Squad ${sortColumn === 'squad' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                            </button>
                        </th>
                        <th>
                            <button class="sort-btn" onclick="window.sortContractsBy('value')">
                                Valor ${sortColumn === 'value' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                            </button>
                        </th>
                        <th>
                            <button class="sort-btn" onclick="window.sortContractsBy('cost')">
                                Custo ${sortColumn === 'cost' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                            </button>
                        </th>
                        <th>
                            <button class="sort-btn" onclick="window.sortContractsBy('profit')">
                                Lucro ${sortColumn === 'profit' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                            </button>
                        </th>
                        <th>
                            <button class="sort-btn" onclick="window.sortContractsBy('margin')">
                                Margem ${sortColumn === 'margin' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                            </button>
                        </th>
                        <th style="text-align: center;">Detalhes</th>
                        <th style="text-align: center;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${contractsData.map(({contract, roi, assignedPeople, squad, warnings}) => `
                        <tr>
                            <td title="${contract.client}">
                                <strong>${contract.client}</strong>
                                ${warnings.length > 0 ? '<span class="warning-indicator" title="Há avisos para este contrato"></span>' : ''}
                            </td>
                            <td title="${squad ? squad.name : 'Nenhum squad'}">${squad ? squad.name : '-'}</td>
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
                                <div class="btn-group" style="display: flex; gap: 0.5rem; justify-content: center;">
                                    <button class="btn btn-small btn-secondary" onclick="window.editContract('${contract.id}')" title="Editar">
                                        ✏️
                                    </button>
                                    <button class="btn btn-small btn-error" onclick="window.deleteContract('${contract.id}')" title="Excluir">
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showContractDetails(contractId) {
    const contract = contractService.getContract(contractId);
    const assignedPeople = (contract.assignedPeople || []).map(id => personService.getPerson(id)).filter(Boolean);
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();
    
    document.getElementById('details-title').textContent = `${contract.client} - Equipe e Entregáveis`;
    
    const detailsContent = document.getElementById('details-content');
    
    detailsContent.innerHTML = `
        <div style="display: grid; gap: 2rem;">
            <!-- Equipe -->
            <div>
                <h3 style="margin: 0 0 1rem 0; color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
                    👥 Equipe (${assignedPeople.length} pessoas)
                </h3>
                ${assignedPeople.length > 0 ? `
                    <div style="display: grid; gap: 0.75rem;">
                        ${assignedPeople.map(person => `
                            <div style="background: var(--bg-darker); padding: 1rem; border-radius: 6px; border: 1px solid var(--border);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong style="font-size: 1.05rem;">${person.name}</strong>
                                        <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">
                                            ${person.role} • R$ ${formatCurrency(person.salary)}/mês
                                        </div>
                                    </div>
                                    ${squadService.getPersonSquads(person.id).length > 0 ? `
                                        <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                            Squad: ${squadService.getPersonSquads(person.id).map(s => s.name).join(', ')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <p style="color: var(--text-secondary); padding: 1rem; background: var(--bg-darker); border-radius: 6px; text-align: center;">
                        Nenhuma pessoa atribuída a este contrato
                    </p>
                `}
            </div>

            <!-- Entregáveis -->
            <div>
                <h3 style="margin: 0 0 1rem 0; color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
                    📦 Entregáveis (${Object.keys(contract.deliverables || {}).length} tipos)
                </h3>
                ${Object.keys(contract.deliverables || {}).length > 0 ? `
                    <div style="display: grid; gap: 0.75rem;">
                        ${Object.entries(contract.deliverables).map(([typeId, qty]) => {
                            const type = deliverableTypes.find(dt => dt.id === typeId);
                            const typeName = type ? type.name : 'Desconhecido';
                            const roles = type ? type.roles.join(', ') : 'N/A';
                            
                            return `
                                <div style="background: var(--bg-darker); padding: 1rem; border-radius: 6px; border: 1px solid var(--border);">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong style="font-size: 1.05rem;">${typeName}</strong>
                                            <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">
                                                Requer: ${roles}
                                            </div>
                                        </div>
                                        <div style="background: var(--primary); color: var(--bg); padding: 0.5rem 1rem; border-radius: 4px; font-weight: bold;">
                                            ${qty}x
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : `
                    <p style="color: var(--text-secondary); padding: 1rem; background: var(--bg-darker); border-radius: 6px; text-align: center;">
                        Nenhum entregável cadastrado
                    </p>
                `}
            </div>

            ${contract.notes ? `
                <div>
                    <h3 style="margin: 0 0 1rem 0; color: var(--primary);">📝 Observações</h3>
                    <div style="background: var(--bg-darker); padding: 1rem; border-radius: 6px; border: 1px solid var(--border); white-space: pre-wrap;">
                        ${contract.notes}
                    </div>
                </div>
            ` : ''}
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
        if (!peopleByRole[person.role]) {
            peopleByRole[person.role] = [];
        }
        peopleByRole[person.role].push(person);
    });

    return `
        <div style="display: grid; gap: 1rem;">
            ${Object.entries(peopleByRole).map(([role, rolePeople]) => `
                <div style="background: var(--bg-darker); padding: 1rem; border-radius: 4px; border: 1px solid var(--border);">
                    <h4 style="margin: 0 0 0.75rem 0; color: var(--primary); font-size: 0.95rem;">${role}</h4>
                    <div style="display: grid; gap: 0.5rem;">
                        ${rolePeople.map(person => {
                            const squads = squadService.getPersonSquads(person.id).map(s => s.name);
                            return `
                                <label class="checkbox-label" style="display: flex; align-items: center; padding: 0.5rem; background: var(--bg); border-radius: 4px; cursor: pointer;">
                                    <input type="checkbox" class="person-checkbox" value="${person.id}" style="margin-right: 0.75rem;">
                                    <div style="flex: 1;">
                                        <strong>${person.name}</strong>
                                        ${squads.length > 0 ? `
                                            <span style="color: var(--text-secondary); font-size: 0.85rem;">
                                                (${squads.join(', ')})
                                            </span>
                                        ` : ''}
                                    </div>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function attachContractHandlers() {
    const form = document.getElementById('contract-form');
    form.addEventListener('submit', handleContractSubmit);
    
    setTimeout(() => {
        const checkboxes = document.querySelectorAll('.person-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateFormValidationWarnings);
        });
    }, 100);

    // Global functions
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
        alert('Não foi possível calcular o ROI deste contrato. Verifique se há pessoas atribuídas.');
        return;
    }
    
    document.getElementById('breakdown-title').textContent = `${contract.client} - Detalhamento de Custo`;
    
    const breakdownContent = document.getElementById('breakdown-content');
    
    breakdownContent.innerHTML = `
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; color: var(--primary);">Receita</h3>
            <div style="font-size: 1.5rem; font-weight: bold;">R$ ${formatCurrency(contract.value)}</div>
        </div>

        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; color: var(--primary);">Custo Detalhado</h3>
            
            ${roi.costBreakdown && roi.costBreakdown.length > 0 ? `
                <div style="display: grid; gap: 1rem;">
                    ${roi.costBreakdown.map(item => `
                        <div style="padding: 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 4px;">
                            <div style="font-weight: bold; margin-bottom: 0.5rem;">
                                ${item.name} (${item.role})
                            </div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                                R$ ${formatCurrency(item.costPerDeliverable)}/entrega × ${item.deliverablesInContract} entregas
                            </div>
                            <div style="font-size: 1.2rem; color: var(--primary);">
                                = R$ ${formatCurrency(item.totalCost)}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="font-size: 1.1rem;">CUSTO TOTAL:</strong>
                        <strong style="font-size: 1.3rem; color: var(--primary);">R$ ${formatCurrency(roi.cost)}</strong>
                    </div>
                </div>
            ` : `
                <p style="color: var(--text-secondary);">Sem custos registrados</p>
            `}
        </div>

        <div style="background: var(--bg-darker); border: 1px solid ${roi.profit > 0 ? 'var(--success)' : 'var(--error)'}; border-radius: 8px; padding: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; color: ${roi.profit > 0 ? 'var(--success)' : 'var(--error)'};">
                ${roi.profit > 0 ? '✅ Lucro' : '⚠️ Prejuízo'}
            </h3>
            <div style="font-size: 1.8rem; font-weight: bold; color: ${roi.profit > 0 ? 'var(--success)' : 'var(--error)'};">
                R$ ${formatCurrency(roi.profit)}
            </div>
            <div style="margin-top: 0.5rem; font-size: 1.1rem; color: var(--text-secondary);">
                Margem: ${roi.margin.toFixed(1)}%
            </div>
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
    const rows = document.querySelectorAll('#contracts-list tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function exportContracts() {
    const contracts = contractService.getAllContracts();
    const dataStr = JSON.stringify(contracts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contratos_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function updateFormValidationWarnings() {
    const warningsContainer = document.getElementById('form-validation-warnings');
    if (!warningsContainer) return;

    const selectedPeople = Array.from(document.querySelectorAll('.person-checkbox:checked'))
        .map(cb => cb.value);
    
    if (selectedPeople.length === 0 || Object.keys(deliverables).length === 0) {
        warningsContainer.innerHTML = '';
        return;
    }

    const mockContract = {
        assignedPeople: selectedPeople,
        deliverables: deliverables
    };

    const warnings = validateContractConsistency(mockContract);
    
    if (warnings.length > 0) {
        warningsContainer.innerHTML = `
            <div style="background: var(--warning-bg, #fff3cd); border: 1px solid var(--warning, #ffc107); border-radius: 4px; padding: 1rem; margin-top: 1rem;">
                <strong style="color: var(--warning-dark, #856404);">⚠️ Avisos de Consistência:</strong>
                <ul style="margin: 0.5rem 0 0 1.5rem; color: var(--warning-dark, #856404);">
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
            if (person) {
                rolesAssigned.add(person.role);
            }
        });
    }
    
    rolesNeeded.forEach(role => {
        if (!rolesAssigned.has(role)) {
            warnings.push({
                type: 'missing_person',
                role: role,
                message: `Falta ${role} na equipe`
            });
        }
    });
    
    rolesAssigned.forEach(role => {
        if (!rolesNeeded.has(role)) {
            warnings.push({
                type: 'unused_person',
                role: role,
                message: `${role} sem entregável correspondente`
            });
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

    const checkboxes = document.querySelectorAll('.person-checkbox:checked');
    const assignedPeople = Array.from(checkboxes).map(cb => cb.value);
    
    const squadTagValue = document.getElementById('squad-tag').value;

    const formData = {
        client: document.getElementById('client').value,
        value: parseFloat(document.getElementById('value').value),
        deliverables: deliverables,
        notes: document.getElementById('notes').value,
        assignedPeople: assignedPeople,
        squadTag: squadTagValue && squadTagValue !== '' ? squadTagValue : null
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
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Nenhum entregável adicionado</p>';
        return;
    }

    container.innerHTML = `
        <div class="tag-container">
            ${Object.entries(deliverables).map(([typeId, qty]) => {
                const type = deliverableTypeService.getDeliverableType(typeId);
                const typeName = type ? type.name : 'Desconhecido';
                const roles = type ? type.roles.join(', ') : '';
                
                return `
                    <div class="tag tag-large">
                        <div style="display: flex; flex-direction: column; flex: 1;">
                            <strong>${typeName}</strong>
                            <span style="font-size: 0.85rem; color: var(--text-secondary);">
                                ${qty}x | Requer: ${roles}
                            </span>
                        </div>
                        <button 
                            type="button" 
                            onclick="window.removeDeliverable('${typeId}')" 
                            style="background: none; border: none; color: var(--error); cursor: pointer; font-size: 1.2rem; padding: 0 0.5rem;"
                        >
                            ×
                        </button>
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
