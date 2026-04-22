// contractsPage.js - Contracts management page (VERSÃO CORRIGIDA)

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
        
        // ✅ CORREÇÃO: Verificar se roi é null antes de acessar propriedades
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
            // Sortable values
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
                        <th>
                            <button class="sort-btn" onclick="window.sortContractsBy('peopleCount')">
                                Equipe ${sortColumn === 'peopleCount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                            </button>
                        </th>
                        <th>
                            <button class="sort-btn" onclick="window.sortContractsBy('deliverablesCount')">
                                Entregas ${sortColumn === 'deliverablesCount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                            </button>
                        </th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${contractsData.map(({contract, roi, assignedPeople, squad, warnings}) => `
                        <tr>
                            <td>
                                <strong>${contract.client}</strong>
                                ${warnings.length > 0 ? `
                                    <div style="margin-top: 0.25rem;">
                                        ${warnings.map(w => `
                                            <span class="badge badge-warning" style="font-size: 0.75rem;">
                                                ${w.message}
                                            </span>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </td>
                            <td>${squad ? squad.name : '-'}</td>
                            <td>R$ ${formatCurrency(contract.value)}</td>
                            <td>
                                <a href="#" onclick="window.showContractBreakdown('${contract.id}'); return false;" style="color: var(--primary); text-decoration: none;">
                                    R$ ${formatCurrency(roi.cost)} 🔍
                                </a>
                            </td>
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
                            <td>${assignedPeople.length} pessoas</td>
                            <td>${Object.keys(contract.deliverables || {}).length} tipos</td>
                            <td>
                                <div class="btn-group">
                                    <button class="btn btn-small btn-secondary" onclick="window.editContract('${contract.id}')">
                                        ✏️
                                    </button>
                                    <button class="btn btn-small btn-error" onclick="window.deleteContract('${contract.id}')">
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
    
    // ✅ CORREÇÃO: Verificar se roi é null
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

    // Mock contract for validation
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
    
    // Get all roles needed for the deliverables
    const rolesNeeded = new Set();
    if (contract.deliverables) {
        Object.keys(contract.deliverables).forEach(typeId => {
            const type = deliverableTypes.find(dt => dt.id === typeId);
            if (type && type.roles) {
                type.roles.forEach(role => rolesNeeded.add(role));
            }
        });
    }
    
    // Get all roles assigned
    const rolesAssigned = new Set();
    if (contract.assignedPeople) {
        contract.assignedPeople.forEach(personId => {
            const person = personService.getPerson(personId);
            if (person) {
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
