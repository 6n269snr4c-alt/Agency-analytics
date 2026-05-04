// contractsPage.js - COM SISTEMA MENSAL + BREAKDOWN DETALHADO + AUTOCOMPLETE DE CLIENTE

import contractService from '../services/contractService.js';
import squadService from '../services/squadService.js';
import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';
import deliverableTypeService from '../services/deliverableTypeService.js';
import storage from '../store/storage.js';
import { renderPeriodSelector } from '../components/periodSelector.js';
import { attachClientAutocomplete } from '../components/clientAutocomplete.js'; // ← NOVO

let currentEditId = null;
let deliverables = {};

export function renderContractsPage() {
    const contentEl = document.getElementById('content');

    const contracts = contractService.getAllContracts();
    const squads = squadService.getAllSquads();
    const people = personService.getAllPeople();
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();
    const currentPeriod = storage.getCurrentPeriod();

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

        <!-- MODAL PRINCIPAL: NOVO / EDITAR CONTRATO -->
        <div id="contract-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="modal-title">Novo Contrato</h2>
                    <button class="modal-close" onclick="window.closeContractModal()">&times;</button>
                </div>
                <form id="contract-form">
                    <div class="form-group">
                        <label class="form-label">Cliente *</label>
                        <input type="text" class="form-input" id="client" required
                               placeholder="Digite ou selecione um cliente existente">
                        <small style="color:var(--text-secondary);font-size:0.78rem;">
                            Clientes já cadastrados aparecerão como sugestão ao digitar.
                        </small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Valor Mensal (R$) *</label>
                        <input type="number" class="form-input" id="value" step="0.01" required>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label class="form-label">Duração (meses)</label>
                            <input
                                type="number"
                                class="form-input"
                                id="duration"
                                min="1"
                                max="36"
                                value="12"
                                placeholder="Ex: 12"
                            >
                        </div>
                        <div class="form-group">
                            <label class="form-label">Início (período)</label>
                            <input
                                type="month"
                                class="form-input"
                                id="startPeriod"
                                value="${currentPeriod}"
                            >
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Entregáveis</label>
                        <div style="display: flex; gap: 0.75rem; align-items: flex-end; margin-bottom: 1rem;">
                            <div style="flex: 1;">
                                <select class="form-input" id="deliverable-type-select">
                                    <option value="">Selecionar tipo...</option>
                                    ${deliverableTypes.map(dt => `<option value="${dt.id}">${dt.name}</option>`).join('')}
                                </select>
                            </div>
                            <div style="width: 100px;">
                                <input type="number" class="form-input" id="deliverable-qty" min="1" placeholder="Qtd">
                            </div>
                            <button type="button" class="btn btn-secondary" onclick="window.addDeliverable()">
                                + Adicionar
                            </button>
                        </div>
                        <div id="deliverables-container"></div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Squad</label>
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

        <!-- MODAL DE DETALHES (equipe e entregáveis) -->
        <div id="details-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="details-title">Detalhes do Contrato</h2>
                    <button class="modal-close" onclick="window.closeDetailsModal()">&times;</button>
                </div>
                <div id="details-content" style="padding: 1.5rem;"></div>
            </div>
        </div>

        <!-- MODAL DE DEBUG -->
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

// ─── ORDENAÇÃO ────────────────────────────────────────────────────────────────

let sortColumn = 'client';
let sortDirection = 'asc';

// ─── LISTA DE CONTRATOS ───────────────────────────────────────────────────────

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

        const hasCalculationError =
            assignedPeople.length > 0 &&
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
                        <th onclick="window.sortContractsBy('client')" style="cursor:pointer;">
                            Cliente ${sortColumn === 'client' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
                        <th>Squad</th>
                        <th onclick="window.sortContractsBy('value')" style="cursor:pointer;">
                            Receita ${sortColumn === 'value' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
                        <th>Duração</th>
                        <th onclick="window.sortContractsBy('cost')" style="cursor:pointer;">
                            Custo ${sortColumn === 'cost' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
                        <th>Lucro</th>
                        <th>Margem</th>
                        <th>Análise</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${contractsData.map(({ contract, roi, squad, warnings, hasCalculationError }) => `
                        <tr>
                            <td>
                                <strong>${contract.client}</strong>
                                ${warnings.length > 0 ? `
                                    <div style="font-size: 0.8rem; color: var(--warning); margin-top: 0.25rem;">
                                        ⚠️ ${warnings.map(w => w.message).join(', ')}
                                    </div>
                                ` : ''}
                                ${hasCalculationError ? `
                                    <div style="font-size: 0.8rem; color: var(--error); margin-top: 0.25rem;">
                                        ❌ Erro no cálculo
                                        <button onclick="window.showDebug('${contract.id}')" style="background:none;border:none;color:var(--error);cursor:pointer;font-size:0.75rem;padding:0;margin-left:4px;">🐛 Debug</button>
                                    </div>
                                ` : ''}
                            </td>
                            <td>${squad ? squad.name : '-'}</td>
                            <td>R$ ${formatCurrency(contract.value)}</td>
                            <td style="color: var(--text-secondary); font-size: 0.9rem;">
                                ${contract.duration ? `${contract.duration} meses` : '-'}
                                ${contract.startPeriod ? `<br><small>${contract.startPeriod}</small>` : ''}
                            </td>
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

// ─── BREAKDOWN DETALHADO ──────────────────────────────────────────────────────

function showContractBreakdown(contractId) {
    const contract = contractService.getContract(contractId);
    const roi = analyticsService.getContractROI(contractId);
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();

    if (!roi) {
        alert('ROI não calculado. Verifique pessoas/entregáveis.');
        return;
    }

    const currentPeriod = storage.getCurrentPeriod();
    const projection = storage.getContractProjection(contractId, currentPeriod);

    const periodInfoHtml = `
        <div style="background: var(--bg-darker); padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; border: 1px solid var(--border);">
            <h3 style="margin: 0 0 0.75rem 0; color: var(--primary);">📅 Período: ${currentPeriod}</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.9rem;">
                <div>Início do contrato: <strong>${contract.startPeriod || 'N/A'}</strong></div>
                <div>Duração: <strong>${contract.duration || 'N/A'} meses</strong></div>
                <div>Status: <strong>${contract.status || 'active'}</strong></div>
                <div>Projeção encontrada: <strong>${projection ? '✅ Sim' : '❌ Não'}</strong></div>
            </div>
        </div>
    `;

    const currentDeliverables = projection ? projection.deliverables : (contract.deliverables || {});
    const deliverablesHtml = `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; color: var(--primary);">📦 Entregáveis (${currentPeriod})</h3>
            <div style="display: grid; gap: 0.5rem;">
                ${Object.entries(currentDeliverables).map(([typeId, qty]) => {
                    const type = deliverableTypes.find(dt => dt.id === typeId);
                    return `
                        <div style="background: var(--bg-darker); padding: 0.75rem; border-radius: 4px; display: flex; justify-content: space-between;">
                            <span>${type ? type.name : 'Desconhecido'} — ${type ? type.roles.join(', ') : ''}</span>
                            <strong>${qty}×</strong>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    let peopleBreakdownHtml = '<div style="margin-bottom: 1.5rem;"><h3 style="margin: 0 0 1rem 0; color: var(--primary);">👥 Custo por Pessoa</h3>';
    if (roi.costBreakdown && roi.costBreakdown.length > 0) {
        roi.costBreakdown.forEach(person => {
            const personData = storage.getPersonById(person.personId);
            if (person.isHead) {
                peopleBreakdownHtml += `
                    <div style="background: var(--bg-darker); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <strong>${person.name}</strong>
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
                const totalPoints = analyticsService.getPersonTotalWeightedDeliverables(person.personId);
                peopleBreakdownHtml += `
                    <div style="background: var(--bg-darker); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <strong>${person.name}</strong>
                            <span class="badge badge-success">${person.role}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                            ├─ Salário: R$ ${formatCurrency(personData ? personData.salary : 0)}/mês<br>
                            ├─ Pontos neste contrato: ${person.weightedPointsInContract.toFixed(1)} pontos<br>
                            ├─ Total de pontos (todos contratos): ${totalPoints.toFixed(1)} pontos<br>
                            ├─ Custo por ponto: R$ ${formatCurrency(person.costPerWeightedPoint)}/ponto<br>
                            └─ <strong style="color: var(--fast-green);">CUSTO NESTE CONTRATO: R$ ${formatCurrency(person.totalCost)}</strong>
                        </div>
                    </div>
                `;
            }
        });
    } else {
        peopleBreakdownHtml += '<p style="color: var(--text-secondary);">Nenhuma pessoa atribuída</p>';
    }
    peopleBreakdownHtml += '</div>';

    const summaryHtml = `
        <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; border: 2px solid ${roi.profit > 0 ? 'var(--fast-green)' : 'var(--error)'};">
            <h3 style="color: ${roi.profit > 0 ? 'var(--fast-green)' : 'var(--error)'}; margin: 0 0 1rem 0; font-size: 1rem; text-transform: uppercase;">
                ${roi.profit > 0 ? '✅ Resumo Financeiro' : '⚠️ Resumo Financeiro'}
            </h3>
            <div style="display: grid; gap: 0.75rem;">
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>💵 Receita (mês):</span>
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
                ${contract.duration ? `
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px; border-top: 1px solid var(--border); margin-top: 0.5rem;">
                    <span>📅 Lucro projetado (${contract.duration} meses):</span>
                    <strong style="color: ${roi.profit > 0 ? 'var(--fast-green)' : 'var(--error)'};">R$ ${formatCurrency(roi.profit * contract.duration)}</strong>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    document.getElementById('breakdown-title').textContent = `Detalhamento: ${contract.client}`;
    document.getElementById('breakdown-content').innerHTML =
        periodInfoHtml + deliverablesHtml + peopleBreakdownHtml + summaryHtml;
    document.getElementById('breakdown-modal').classList.add('active');
}

function closeBreakdownModal() {
    document.getElementById('breakdown-modal').classList.remove('active');
}

// ─── DEBUG MODAL ──────────────────────────────────────────────────────────────

function showDebug(contractId) {
    const contract = contractService.getContract(contractId);
    const people = (contract.assignedPeople || [])
        .map(id => personService.getPerson(id))
        .filter(Boolean);
    const deliverableTypes = deliverableTypeService.getActiveDeliverableTypes();

    const debugHtml = `
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

            <div style="margin: 1rem 0;">
                <strong style="color: #ffaa00;">PERÍODO:</strong><br>
                - startPeriod: ${contract.startPeriod || 'não definido'}<br>
                - duration: ${contract.duration || 'não definido'}<br>
                - status: ${contract.status || 'não definido'}
            </div>
        </div>
    `;

    document.getElementById('debug-content').innerHTML = debugHtml;
    document.getElementById('debug-modal').classList.add('active');
}

function closeDebugModal() {
    document.getElementById('debug-modal').classList.remove('active');
}

// ─── DETALHES (equipe + entregáveis) ─────────────────────────────────────────

function showContractDetails(contractId) {
    const contract = contractService.getContract(contractId);
    const assignedPeople = (contract.assignedPeople || [])
        .map(id => personService.getPerson(id))
        .filter(Boolean);
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

// ─── TEAM ASSIGNMENT ──────────────────────────────────────────────────────────

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

// ─── HANDLERS ────────────────────────────────────────────────────────────────

function attachContractHandlers() {
    document.getElementById('contract-form').addEventListener('submit', handleContractSubmit);

    setTimeout(() => {
        document.querySelectorAll('.person-checkbox').forEach(cb => {
            cb.addEventListener('change', updateFormValidationWarnings);
        });
    }, 100);

    window.openContractModal     = openContractModal;
    window.closeContractModal    = closeContractModal;
    window.editContract          = editContract;
    window.deleteContract        = deleteContract;
    window.addDeliverable        = addDeliverable;
    window.removeDeliverable     = removeDeliverable;
    window.exportContracts       = exportContracts;
    window.showContractBreakdown = showContractBreakdown;
    window.closeBreakdownModal   = closeBreakdownModal;
    window.showContractDetails   = showContractDetails;
    window.closeDetailsModal     = closeDetailsModal;
    window.showDebug             = showDebug;
    window.closeDebugModal       = closeDebugModal;
    window.filterContracts       = filterContracts;
    window.sortContractsBy       = sortContractsBy;
}

function openContractModal() {
    currentEditId = null;
    deliverables = {};
    document.getElementById('contract-modal').classList.add('active');
    document.getElementById('modal-title').textContent = 'Novo Contrato';
    document.getElementById('contract-form').reset();

    document.getElementById('duration').value    = 12;
    document.getElementById('startPeriod').value = storage.getCurrentPeriod();

    renderDeliverables();

    // ← Autocomplete de cliente
    setTimeout(() => attachClientAutocomplete(document.getElementById('client')), 50);
}

function closeContractModal() {
    document.getElementById('contract-modal').classList.remove('active');
    currentEditId = null;
    deliverables = {};
}

function editContract(id) {
    currentEditId = id;
    const contract = contractService.getContract(id);

    document.getElementById('client').value      = contract.client;
    document.getElementById('value').value       = contract.value;
    document.getElementById('notes').value       = contract.notes || '';
    document.getElementById('duration').value    = contract.duration || 12;
    document.getElementById('startPeriod').value = contract.startPeriod || storage.getCurrentPeriod();

    deliverables = { ...(contract.deliverables || contract.baseDeliverables || {}) };
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

    // ← Autocomplete de cliente
    setTimeout(() => attachClientAutocomplete(document.getElementById('client')), 50);
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

// ─── SUBMIT ───────────────────────────────────────────────────────────────────

function handleContractSubmit(e) {
    e.preventDefault();

    const assignedPeople = Array.from(
        document.querySelectorAll('.person-checkbox:checked')
    ).map(cb => cb.value);

    const squadTagValue = document.getElementById('squad-tag').value;
    const baseValue     = parseFloat(document.getElementById('value').value);
    const duration      = parseInt(document.getElementById('duration').value) || 12;
    const startPeriod   = document.getElementById('startPeriod').value || storage.getCurrentPeriod();

    const formData = {
        client:           document.getElementById('client').value,
        value:            baseValue,
        baseValue:        baseValue,
        deliverables:     { ...deliverables },
        baseDeliverables: { ...deliverables },
        duration:         duration,
        startPeriod:      startPeriod,
        status:           'active',
        notes:            document.getElementById('notes').value,
        assignedPeople:   assignedPeople,
        squadTag:         squadTagValue || null
    };

    try {
        if (currentEditId) {
            contractService.updateContract(currentEditId, formData);
            if (typeof storage.generateContractProjections === 'function') {
                storage.generateContractProjections(currentEditId);
            }
        } else {
            const newContract = contractService.createContract(formData);
            if (newContract && typeof storage.generateContractProjections === 'function') {
                storage.generateContractProjections(newContract.id);
            }
        }

        closeContractModal();
        renderContractsPage();
    } catch (error) {
        alert(error.message);
    }
}

// ─── EXCLUIR ──────────────────────────────────────────────────────────────────

function deleteContract(id) {
    if (confirm('Excluir este contrato?')) {
        contractService.deleteContract(id);
        renderContractsPage();
    }
}

// ─── ENTREGÁVEIS ─────────────────────────────────────────────────────────────

function addDeliverable() {
    const typeSelect = document.getElementById('deliverable-type-select');
    const typeId = typeSelect?.value;
    const qty = parseInt(document.getElementById('deliverable-qty').value);

    if (!typeId) { alert('Selecione um tipo'); return; }
    if (!qty || qty < 1) { alert('Quantidade inválida'); return; }

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
                        <button
                            type="button"
                            onclick="window.removeDeliverable('${typeId}')"
                            style="background: none; border: none; color: var(--error); cursor: pointer; font-size: 1.2rem;"
                        >×</button>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ─── VALIDAÇÃO ────────────────────────────────────────────────────────────────

function updateFormValidationWarnings() {
    const warningsContainer = document.getElementById('form-validation-warnings');
    if (!warningsContainer) return;

    const selectedPeople = Array.from(
        document.querySelectorAll('.person-checkbox:checked')
    ).map(cb => cb.value);

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

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}
