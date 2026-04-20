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
        const assignedPeople = contract.assignedPeople || [];
        const squad = contract.squadTag ? squadService.getSquad(contract.squadTag) : null;
        const warnings = validateContractConsistency(contract);
        
        return {
            contract,
            roi,
            assignedPeople,
            squad,
            warnings,
            // Sortable values
            clientName: contract.client.toLowerCase(),
            cost: roi.cost,
            squadName: squad ? squad.name.toLowerCase() : 'zzz',
            value: contract.value,
            profit: roi.profit,
            margin: roi.margin,
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
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                    <tr style="background: var(--bg); border-bottom: 2px solid var(--border);">
                        <th style="padding: 0.4rem 0.75rem; text-align: left; font-weight: bold; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; cursor: pointer; border-right: 1px solid var(--border);" onclick="window.sortContractsBy('client')">
                            CLIENTE ${sortColumn === 'client' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style="padding: 0.4rem 0.75rem; text-align: left; font-weight: bold; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; cursor: pointer; border-right: 1px solid var(--border);" onclick="window.sortContractsBy('squad')">
                            SQUAD ${sortColumn === 'squad' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style="padding: 0.4rem 0.75rem; text-align: right; font-weight: bold; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; cursor: pointer; border-right: 1px solid var(--border);" onclick="window.sortContractsBy('value')">
                            VALOR ${sortColumn === 'value' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style="padding: 0.4rem 0.75rem; text-align: right; font-weight: bold; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; cursor: pointer; border-right: 1px solid var(--border);" onclick="window.sortContractsBy('cost')">
                            CUSTO ${sortColumn === 'cost' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style="padding: 0.4rem 0.75rem; text-align: right; font-weight: bold; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; cursor: pointer; border-right: 1px solid var(--border);" onclick="window.sortContractsBy('profit')">
                            LUCRO ${sortColumn === 'profit' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style="padding: 0.4rem 0.75rem; text-align: center; font-weight: bold; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; cursor: pointer; border-right: 1px solid var(--border);" onclick="window.sortContractsBy('margin')">
                            MARGEM ${sortColumn === 'margin' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style="padding: 0.4rem 0.75rem; text-align: center; font-weight: bold; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; cursor: pointer; border-right: 1px solid var(--border);" onclick="window.sortContractsBy('peopleCount')">
                            PESSOAS ${sortColumn === 'peopleCount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style="padding: 0.4rem 0.75rem; text-align: left; font-weight: bold; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; cursor: pointer; border-right: 1px solid var(--border);" onclick="window.sortContractsBy('deliverablesCount')">
                            ENTREGÁVEIS ${sortColumn === 'deliverablesCount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th style="padding: 0.4rem 0.75rem; text-align: center; font-weight: bold; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">
                            AÇÕES
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${contractsData.map(data => {
                        const { contract, roi, assignedPeople, squad, warnings } = data;
                        const deliverables = contract.deliverables || {};
                        
                        const deliverablesText = Object.entries(deliverables).length > 0 
                            ? Object.entries(deliverables).map(([typeId, qty]) => {
                                const type = deliverableTypeService.getDeliverableType(typeId);
                                const typeName = type ? type.name : 'Removido';
                                return `${typeName}: ${qty}`;
                            }).join(', ')
                            : '-';
                        
                        return `
                            <tr style="border-bottom: 1px solid var(--border); ${warnings.length > 0 ? 'background: rgba(220, 38, 38, 0.05);' : ''} transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='${warnings.length > 0 ? 'rgba(220, 38, 38, 0.05)' : 'transparent'}'">
                                <td style="padding: 0.4rem 0.6rem; border-right: 1px solid var(--border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                                    <span style="font-weight: 500;">${contract.client}</span>
                                    ${warnings.length > 0 ? ` <span style="color: var(--error); font-size: 0.8rem;">⚠️</span>` : ''}
                                </td>
                                <td style="padding: 0.4rem 0.6rem; border-right: 1px solid var(--border);">
                                    ${squad ? `<span style="font-size: 0.8rem; background: var(--success); color: #000; padding: 0.2rem 0.5rem; border-radius: 3px; white-space: nowrap; font-weight: 500;">${squad.icon ? squad.icon + ' ' : ''}${squad.name}</span>` : '<span style="color: var(--text-secondary); font-size: 0.8rem;">-</span>'}
                                </td>
                                <td style="padding: 0.4rem 0.6rem; text-align: right; border-right: 1px solid var(--border); white-space: nowrap;">
                                    R$ ${formatCurrency(contract.value)}
                                </td>
                                <td style="padding: 0.4rem 0.6rem; text-align: right; border-right: 1px solid var(--border); white-space: nowrap; color: var(--text-secondary);">
                                    R$ ${formatCurrency(roi.cost)}
                                </td>
                                <td style="padding: 0.4rem 0.6rem; text-align: right; border-right: 1px solid var(--border); white-space: nowrap; color: ${roi.profit > 0 ? 'var(--success)' : 'var(--error)'}; font-weight: 500;">
                                    R$ ${formatCurrency(roi.profit)}
                                </td>
                                <td style="padding: 0.4rem 0.6rem; text-align: center; border-right: 1px solid var(--border);">
                                    ${roi.margin.toFixed(1)}%
                                </td>
                                <td style="padding: 0.4rem 0.6rem; text-align: center; border-right: 1px solid var(--border);" title="${assignedPeople.map(id => {const p = personService.getPerson(id); return p ? p.name : '';}).filter(Boolean).join('\\n')}">
                                    <span style="cursor: help;">👥 ${assignedPeople.length}</span>
                                </td>
                                <td style="padding: 0.4rem 0.6rem; text-align: center; border-right: 1px solid var(--border);" title="${deliverablesText}">
                                    <span style="cursor: help;">🔍 ${Object.keys(deliverables).length}</span>
                                </td>
                                <td style="padding: 0.4rem 0.6rem; text-align: center;">
                                    <div style="display: flex; gap: 0.25rem; justify-content: center;">
                                        <button class="btn btn-small btn-secondary" onclick="window.showContractBreakdown('${contract.id}')" title="Ver breakdown" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">📊</button>
                                        <button class="btn btn-small btn-secondary" onclick="window.editContract('${contract.id}')" title="Editar" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">✏️</button>
                                        <button class="btn btn-small btn-danger" onclick="window.deleteContract('${contract.id}')" title="Excluir" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderTeamAssignment(people) {
    if (people.length === 0) {
        return '<p style="color: var(--text-secondary);">Nenhuma pessoa cadastrada</p>';
    }

    // Filter out Head Executivo - they are assigned via squad
    const selectablePeople = people.filter(p => p.role !== 'Head Executivo');
    
    if (selectablePeople.length === 0) {
        return '<p style="color: var(--text-secondary);">Nenhuma pessoa disponível (Heads são atribuídos via squad)</p>';
    }

    // Group people by role
    const peopleByRole = {};
    selectablePeople.forEach(person => {
        if (!peopleByRole[person.role]) {
            peopleByRole[person.role] = [];
        }
        peopleByRole[person.role].push(person);
    });

    return `
        <div style="display: grid; gap: 1rem;">
            ${Object.entries(peopleByRole).map(([role, rolePeople]) => `
                <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 4px; padding: 1rem;">
                    <strong style="display: block; margin-bottom: 0.75rem; color: var(--primary);">${role}</strong>
                    ${rolePeople.map(person => {
                        const squads = personService.getPersonSquadNames(person.id);
                        return `
                            <label style="display: block; margin: 0.5rem 0; cursor: pointer;">
                                <input type="checkbox" value="${person.id}" class="person-checkbox" style="margin-right: 0.5rem;">
                                ${person.name} - R$ ${formatCurrency(person.salary)}
                                ${squads.length > 0 ? `
                                    <span style="color: var(--text-secondary); font-size: 0.85rem;">
                                        (${squads.join(', ')})
                                    </span>
                                ` : ''}
                            </label>
                        `;
                    }).join('')}
                </div>
            `).join('')}
        </div>
    `;
}

function attachContractHandlers() {
    const form = document.getElementById('contract-form');
    form.addEventListener('submit', handleContractSubmit);
    
    // Add listeners to person checkboxes for real-time validation
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
    filterContracts();
}

function filterContracts() {
    const searchTerm = document.getElementById('contract-search').value.toLowerCase();
    const contracts = contractService.getAllContracts();
    
    const filtered = contracts.filter(contract => {
        const client = contract.client.toLowerCase();
        const squad = contract.squadTag ? squadService.getSquad(contract.squadTag)?.name.toLowerCase() : '';
        const people = contract.assignedPeople?.map(id => {
            const person = personService.getPerson(id);
            return person ? person.name.toLowerCase() : '';
        }).join(' ') || '';
        
        return client.includes(searchTerm) || 
               squad.includes(searchTerm) || 
               people.includes(searchTerm);
    });
    
    document.getElementById('contracts-list').innerHTML = renderContractsList(filtered);
}

function validateContractConsistency(contract) {
    const warnings = [];
    
    // Get all roles needed for deliverables (excluding Head Executivo)
    const rolesNeeded = new Set();
    if (contract.deliverables) {
        Object.keys(contract.deliverables).forEach(typeId => {
            const type = deliverableTypeService.getDeliverableType(typeId);
            if (type && type.roles) {
                type.roles.forEach(role => {
                    if (role !== 'Head Executivo') {
                        rolesNeeded.add(role);
                    }
                });
            }
        });
    }
    
    // Get all roles assigned to contract (excluding Head Executivo)
    const rolesAssigned = new Set();
    if (contract.assignedPeople) {
        contract.assignedPeople.forEach(personId => {
            const person = personService.getPerson(personId);
            if (person && person.role !== 'Head Executivo') {
                rolesAssigned.add(person.role);
            }
        });
    }
    
    // Check 1: Missing roles for deliverables
    rolesNeeded.forEach(role => {
        if (!rolesAssigned.has(role)) {
            warnings.push({
                type: 'missing_person',
                role: role,
                message: `Falta ${role} na equipe`
            });
        }
    });
    
    // Check 2: People without relevant deliverables
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

    // Set squad tag
    if (contract.squadTag) {
        document.getElementById('squad-tag').value = contract.squadTag;
    }

    // Check assigned people
    if (contract.assignedPeople && contract.assignedPeople.length > 0) {
        // Wait for DOM to be ready
        setTimeout(() => {
            contract.assignedPeople.forEach(personId => {
                const checkbox = document.querySelector(`.person-checkbox[value="${personId}"]`);
                if (checkbox) checkbox.checked = true;
            });
            // Update validation warnings after checkboxes are marked
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
    
    // Show validation warnings in modal
    updateFormValidationWarnings();
}

function updateFormValidationWarnings() {
    const warningsContainer = document.getElementById('form-validation-warnings');
    if (!warningsContainer) return;
    
    // Get selected people roles (excluding Head Executivo)
    const selectedPeople = Array.from(document.querySelectorAll('.person-checkbox:checked')).map(cb => cb.value);
    const rolesAssigned = new Set();
    selectedPeople.forEach(personId => {
        const person = personService.getPerson(personId);
        if (person && person.role !== 'Head Executivo') {
            rolesAssigned.add(person.role);
        }
    });
    
    // Get roles needed for deliverables (excluding Head Executivo)
    const rolesNeeded = new Set();
    Object.keys(deliverables).forEach(typeId => {
        const type = deliverableTypeService.getDeliverableType(typeId);
        if (type && type.roles) {
            type.roles.forEach(role => {
                if (role !== 'Head Executivo') {
                    rolesNeeded.add(role);
                }
            });
        }
    });
    
    const warnings = [];
    
    // Check missing roles
    rolesNeeded.forEach(role => {
        if (!rolesAssigned.has(role)) {
            warnings.push(`⚠️ Falta <strong>${role}</strong> na equipe`);
        }
    });
    
    // Check unused people
    rolesAssigned.forEach(role => {
        if (!rolesNeeded.has(role)) {
            warnings.push(`⚠️ <strong>${role}</strong> selecionado mas sem entregável correspondente`);
        }
    });
    
    if (warnings.length > 0) {
        warningsContainer.innerHTML = `
            <div style="background: rgba(255, 59, 48, 0.1); border: 2px solid var(--error); border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                <div style="font-weight: bold; color: var(--error); margin-bottom: 0.5rem;">⚠️ Atenção:</div>
                <ul style="margin: 0; padding-left: 1.5rem; color: var(--error);">
                    ${warnings.map(w => `<li style="margin: 0.25rem 0;">${w}</li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        warningsContainer.innerHTML = '';
    }
}

function exportContracts() {
    const contracts = contractService.getAllContracts();
    
    if (contracts.length === 0) {
        alert('Nenhum contrato para exportar');
        return;
    }

    // Get all unique roles and deliverable types
    const allRoles = new Set();
    const allDeliverables = new Set();
    
    contracts.forEach(contract => {
        if (contract.assignedPeople) {
            contract.assignedPeople.forEach(personId => {
                const person = personService.getPerson(personId);
                if (person) allRoles.add(person.role);
            });
        }
        if (contract.deliverables) {
            Object.keys(contract.deliverables).forEach(typeId => {
                const type = deliverableTypeService.getDeliverableType(typeId);
                if (type) allDeliverables.add(type.name);
            });
        }
    });

    // Prepare data for export
    const exportData = contracts.map(contract => {
        const squad = contract.squadTag ? squadService.getSquad(contract.squadTag) : null;
        const head = squad && squad.headId ? personService.getPerson(squad.headId) : null;
        
        const row = {
            'Cliente': contract.client,
            'Valor': `R$ ${formatCurrency(contract.value)}`,
            'Squad': squad ? squad.name : '',
            'Head Executivo': head ? head.name : ''
        };
        
        // Add people by role (in fixed order)
        Array.from(allRoles).sort().forEach(role => {
            const peopleInRole = [];
            if (contract.assignedPeople) {
                contract.assignedPeople.forEach(personId => {
                    const person = personService.getPerson(personId);
                    if (person && person.role === role) {
                        peopleInRole.push(person.name);
                    }
                });
            }
            row[role] = peopleInRole.join(', ');
        });
        
        // Add deliverables (in fixed order)
        Array.from(allDeliverables).sort().forEach(deliverableName => {
            let qty = '';
            if (contract.deliverables) {
                Object.entries(contract.deliverables).forEach(([typeId, quantity]) => {
                    const type = deliverableTypeService.getDeliverableType(typeId);
                    if (type && type.name === deliverableName) {
                        qty = quantity;
                    }
                });
            }
            row[deliverableName] = qty;
        });
        
        return row;
    });

    // Create CSV with ordered headers
    const baseHeaders = ['Cliente', 'Valor', 'Squad', 'Head Executivo'];
    const roleHeaders = Array.from(allRoles).sort();
    const deliverableHeaders = Array.from(allDeliverables).sort();
    const headers = [...baseHeaders, ...roleHeaders, ...deliverableHeaders];
    
    // Create CSV content
    let csv = headers.map(h => `"${h}"`).join(',') + '\n';
    
    exportData.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            return value !== undefined && value !== '' ? `"${value}"` : '""';
        });
        csv += values.join(',') + '\n';
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `contratos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
