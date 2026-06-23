// contractsPage.js — v3
// Formulário simplificado: Cliente/Valor → Vídeo/Estático → Pessoas (rateado ou fixo)
// Sem catálogo de entregáveis, sem pesos. Inclui autocomplete de cliente e duplicar contrato.

import contractService from '../services/contractService.js';
import squadService from '../services/squadService.js';
import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';
import storage from '../store/storage.js';
import { renderPeriodSelector } from '../components/periodSelector.js';
import { attachClientAutocomplete } from '../components/clientAutocomplete.js';

let currentEditId = null;
let draftAllocations = []; // [{ personId, mode, fixedValue }] — estado do formulário aberto

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(value) {
    return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function marginBadgeClass(margin) {
    if (margin >= 30) return 'badge-success';
    if (margin >= 15) return 'badge-warning';
    return 'badge-error';
}

// ─── entry point ──────────────────────────────────────────────────────────────

export function renderContractsPage() {
    const contentEl = document.getElementById('content');

    const contracts = contractService.getAllContracts();
    const squads = squadService.getAllSquads();
    const currentPeriod = storage.getCurrentPeriod();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Contratos</h1>
            <p class="page-subtitle">Gerenciar contratos, volume de entregas e alocação de equipe</p>
        </div>

        ${renderPeriodSelector()}

        <div class="action-bar">
            <div class="action-bar-left">
                <button class="btn btn-primary" onclick="window.openContractModal()">+ Novo Contrato</button>
                <button class="btn btn-secondary" onclick="window.exportContracts()">📥 Exportar Dados</button>
            </div>
            <div class="action-bar-right">
                <input type="text" class="form-input" id="contract-search"
                       placeholder="🔍 Buscar contrato..." style="max-width: 280px;"
                       oninput="window.filterContracts()">
            </div>
        </div>

        <div id="contracts-list">
            ${renderContractsList(contracts, squads)}
        </div>

        <!-- MODAL: NOVO/EDITAR CONTRATO -->
        <div id="contract-modal" class="modal">
            <div class="modal-content" style="max-width: 720px;">
                <div class="modal-header">
                    <h2 class="modal-title" id="modal-title">Novo Contrato</h2>
                    <button class="modal-close" onclick="window.closeContractModal()">&times;</button>
                </div>
                <div id="contract-form-body"></div>
            </div>
        </div>

        <!-- MODAL: BREAKDOWN -->
        <div id="breakdown-modal" class="modal">
            <div class="modal-content" style="max-width: 720px;">
                <div class="modal-header">
                    <h2 class="modal-title" id="breakdown-title">Detalhamento de Custo</h2>
                    <button class="modal-close" onclick="window.closeBreakdownModal()">&times;</button>
                </div>
                <div id="breakdown-content" style="padding: 1.5rem;"></div>
            </div>
        </div>

        <style>${contractStyles()}</style>
    `;

    attachContractHandlers(squads);
}

// ─── ORDENAÇÃO E LISTA ────────────────────────────────────────────────────────

let sortColumn = 'client';
let sortDirection = 'asc';

function renderContractsList(contracts, squads) {
    if (contracts.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>Nenhum contrato cadastrado</h3>
                <p>Comece criando seu primeiro contrato</p>
            </div>
        `;
    }

    const rows = contracts.map(contract => {
        const roi = analyticsService.getContractROI(contract.id);
        const squad = contract.squadTag ? squadService.getSquad(contract.squadTag) : null;
        return { contract, roi, squad };
    });

    rows.sort((a, b) => {
        let cmp = 0;
        if (sortColumn === 'client') cmp = a.contract.client.toLowerCase().localeCompare(b.contract.client.toLowerCase());
        else if (sortColumn === 'value') cmp = a.contract.value - b.contract.value;
        else if (sortColumn === 'cost') cmp = a.roi.cost - b.roi.cost;
        return sortDirection === 'asc' ? cmp : -cmp;
    });

    return `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th onclick="window.sortContractsBy('client')" style="cursor:pointer;">Cliente ${sortColumn==='client' ? (sortDirection==='asc'?'↑':'↓') : '↕'}</th>
                        <th>Squad</th>
                        <th>🎬 Vídeo</th>
                        <th>🖼️ Estático</th>
                        <th onclick="window.sortContractsBy('value')" style="cursor:pointer;">Receita ${sortColumn==='value' ? (sortDirection==='asc'?'↑':'↓') : '↕'}</th>
                        <th onclick="window.sortContractsBy('cost')" style="cursor:pointer;">Custo ${sortColumn==='cost' ? (sortDirection==='asc'?'↑':'↓') : '↕'}</th>
                        <th>Margem</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(({ contract, roi, squad }) => `
                        <tr>
                            <td><strong>${contract.client}</strong></td>
                            <td>${squad ? `${squad.icon || ''} ${squad.name}` : '-'}</td>
                            <td style="text-align:center;">${contract.videoCount || 0}</td>
                            <td style="text-align:center;">${contract.staticCount || 0}</td>
                            <td>R$ ${fmt(contract.value)}</td>
                            <td>R$ ${fmt(roi.cost)}</td>
                            <td><span class="badge ${marginBadgeClass(roi.margin)}">${roi.margin.toFixed(1)}%</span></td>
                            <td>
                                <div style="display:flex; gap:0.4rem; justify-content:center;">
                                    <button class="btn btn-small btn-primary" onclick="window.showContractBreakdown('${contract.id}')" title="Ver cálculo">🔍</button>
                                    <button class="btn btn-small btn-secondary" onclick="window.editContract('${contract.id}')" title="Editar">✏️</button>
                                    <button class="btn btn-small btn-secondary" onclick="window.duplicateContractPrompt('${contract.id}')" title="Duplicar">📄</button>
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

// ─── FORMULÁRIO (etapas) ──────────────────────────────────────────────────────

function renderContractForm(contract, squads, currentPeriod) {
    const allPeople = personService.getAllPeople();
    draftAllocations = contract
        ? (contract.peopleAllocations || []).map(a => ({ ...a }))
        : [];

    return `
        <div style="padding: 1.5rem; display:flex; flex-direction:column; gap:1.5rem;">

            <!-- ETAPA 1: Cliente e valor -->
            <div class="form-step">
                <div class="form-step-label">1. Cliente e contrato</div>
                <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">Cliente *</label>
                        <input type="text" class="form-input" id="client" required
                               value="${contract?.client || ''}"
                               placeholder="Digite ou selecione um cliente existente">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">Valor Mensal (R$) *</label>
                        <input type="number" class="form-input" id="value" step="0.01" required
                               value="${contract?.value || ''}">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">Duração (meses)</label>
                        <input type="number" class="form-input" id="duration" min="1" max="36"
                               value="${contract?.duration || 12}">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">Início</label>
                        <input type="month" class="form-input" id="startPeriod"
                               value="${contract?.startPeriod || currentPeriod}">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">Squad</label>
                        <select class="form-select" id="squad-tag">
                            <option value="">Nenhum</option>
                            ${squads.map(s => `<option value="${s.id}" ${contract?.squadTag === s.id ? 'selected' : ''}>${s.icon||''} ${s.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <!-- ETAPA 2: Volume de entregáveis -->
            <div class="form-step">
                <div class="form-step-label">2. Volume de entregas no mês</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">🎬 Conteúdo em Vídeo</label>
                        <input type="number" class="form-input" id="video-count" min="0" step="1"
                               value="${contract?.videoCount || 0}">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">🖼️ Conteúdo Estático</label>
                        <input type="number" class="form-input" id="static-count" min="0" step="1"
                               value="${contract?.staticCount || 0}">
                    </div>
                </div>
                <small style="color:var(--text-secondary); font-size:0.78rem;">
                    Usado para ratear automaticamente o custo de Copy, Filmmaker, Designer e o Head do squad.
                </small>
            </div>

            <!-- ETAPA 3: Pessoas -->
            <div class="form-step">
                <div class="form-step-label">3. Equipe atribuída</div>

                <div style="position:relative; margin-bottom: 1rem;">
                    <input type="text" class="form-input" id="person-search"
                           placeholder="🔍 Buscar pessoa para adicionar...">
                    <div id="person-search-results" class="person-search-dropdown"></div>
                </div>

                <div id="allocations-list">
                    ${renderAllocationsList(allPeople)}
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="window.closeContractModal()">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="window.saveContract()">💾 Salvar Contrato</button>
            </div>
        </div>
    `;
}

function renderAllocationsList(allPeople) {
    if (draftAllocations.length === 0) {
        return `<p style="color:var(--text-secondary); font-size:0.9rem; padding: 0.5rem 0;">Nenhuma pessoa atribuída ainda. Use a busca acima.</p>`;
    }

    return draftAllocations.map(alloc => {
        const person = allPeople.find(p => p.id === alloc.personId);
        if (!person) return '';
        return `
            <div class="allocation-row" data-person-id="${person.id}">
                <div class="allocation-person">
                    <strong>${person.name}</strong>
                    <span class="allocation-role">${person.role}</span>
                </div>
                <div class="allocation-mode">
                    <label class="mode-toggle">
                        <input type="radio" name="mode-${person.id}" value="rateado"
                               ${alloc.mode === 'rateado' ? 'checked' : ''}
                               onchange="window.setAllocationMode('${person.id}', 'rateado')">
                        Rateado
                    </label>
                    <label class="mode-toggle">
                        <input type="radio" name="mode-${person.id}" value="fixo"
                               ${alloc.mode === 'fixo' ? 'checked' : ''}
                               onchange="window.setAllocationMode('${person.id}', 'fixo')">
                        Fixo
                    </label>
                </div>
                <div class="allocation-fixed-value" style="${alloc.mode === 'fixo' ? '' : 'visibility:hidden;'}">
                    <span style="font-size:0.85rem; color:var(--text-secondary);">R$</span>
                    <input type="number" class="form-input allocation-fixed-input" min="0" step="0.01"
                           value="${alloc.fixedValue || ''}" placeholder="0,00"
                           oninput="window.setFixedValue('${person.id}', this.value)"
                           style="width:110px;">
                </div>
                <button type="button" class="btn btn-small btn-danger" onclick="window.removeAllocation('${person.id}')">✕</button>
            </div>
        `;
    }).join('');
}

// ─── BREAKDOWN ────────────────────────────────────────────────────────────────

function showContractBreakdown(contractId) {
    const contract = contractService.getContract(contractId);
    const roi = analyticsService.getContractROI(contractId);

    document.getElementById('breakdown-title').textContent = `Detalhamento: ${contract.client}`;

    const volumeHtml = `
        <div style="background:var(--bg-darker); padding:1rem; border-radius:8px; margin-bottom:1.5rem; display:flex; gap:2rem;">
            <div><span style="color:var(--text-secondary); font-size:0.8rem;">🎬 Vídeo</span><br><strong style="font-size:1.2rem;">${roi.videoCount}</strong></div>
            <div><span style="color:var(--text-secondary); font-size:0.8rem;">🖼️ Estático</span><br><strong style="font-size:1.2rem;">${roi.staticCount}</strong></div>
        </div>
    `;

    const peopleHtml = roi.costBreakdown.map(item => {
        if (item.mode === 'fixo') {
            return `
                <div class="breakdown-person-card">
                    <div class="breakdown-person-header">
                        <strong>${item.name}</strong>
                        <span class="badge" style="background:rgba(255,160,0,0.15); color:#ff9800;">Fixo</span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-secondary);">Valor travado neste contrato</div>
                    <div style="margin-top:0.5rem; font-size:1.1rem; font-weight:700; color:var(--fast-green,#7cfc00);">R$ ${fmt(item.totalCost)}</div>
                </div>
            `;
        }
        if (item.mode === 'head') {
            return `
                <div class="breakdown-person-card">
                    <div class="breakdown-person-header">
                        <strong>${item.name}</strong>
                        <span class="badge badge-success">Automático</span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-secondary);">Rateado por volume (vídeo+estático) dos clientes do squad</div>
                    <div style="margin-top:0.5rem; font-size:1.1rem; font-weight:700; color:var(--fast-green,#7cfc00);">R$ ${fmt(item.totalCost)}</div>
                </div>
            `;
        }
        return `
            <div class="breakdown-person-card">
                <div class="breakdown-person-header">
                    <strong>${item.name}</strong>
                    <span class="badge badge-info">Rateado</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.6;">
                    Salário: R$ ${fmt(item.salary)}<br>
                    Entregas aqui: ${item.relevantHere} de ${item.totalRateable} totais (${item.totalRateable > 0 ? ((item.relevantHere/item.totalRateable)*100).toFixed(1) : 0}%)
                </div>
                <div style="margin-top:0.5rem; font-size:1.1rem; font-weight:700; color:var(--fast-green,#7cfc00);">R$ ${fmt(item.totalCost)}</div>
            </div>
        `;
    }).join('');

    const summaryHtml = `
        <div style="background:var(--bg-darker); padding:1.25rem; border-radius:8px; border:2px solid ${roi.profit > 0 ? 'var(--fast-green,#7cfc00)' : 'var(--error,#f44336)'}; margin-top:1.5rem;">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;"><span>Receita</span><strong>R$ ${fmt(roi.revenue)}</strong></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;"><span>Custo Total</span><strong style="color:var(--error,#f44336)">R$ ${fmt(roi.cost)}</strong></div>
            <div style="display:flex; justify-content:space-between; padding-top:0.5rem; border-top:1px solid var(--border);">
                <span style="font-weight:700;">Lucro</span>
                <strong style="color:${roi.profit > 0 ? 'var(--fast-green,#7cfc00)' : 'var(--error,#f44336)'}; font-size:1.2rem;">R$ ${fmt(roi.profit)} (${roi.margin.toFixed(1)}%)</strong>
            </div>
        </div>
    `;

    document.getElementById('breakdown-content').innerHTML = volumeHtml +
        `<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:1rem;">${peopleHtml}</div>` +
        summaryHtml;
    document.getElementById('breakdown-modal').classList.add('active');
}

function closeBreakdownModal() {
    document.getElementById('breakdown-modal').classList.remove('active');
}

// ─── HANDLERS ─────────────────────────────────────────────────────────────────

function attachContractHandlers(squads) {
    window.openContractModal  = () => openContractModal(squads);
    window.closeContractModal = closeContractModal;
    window.editContract       = (id) => editContract(id, squads);
    window.deleteContract     = deleteContract;
    window.duplicateContractPrompt = duplicateContractPrompt;
    window.exportContracts    = exportContracts;
    window.filterContracts    = filterContracts;
    window.sortContractsBy    = sortContractsBy;
    window.showContractBreakdown = showContractBreakdown;
    window.closeBreakdownModal = closeBreakdownModal;
    window.saveContract       = saveContract;

    window.setAllocationMode = (personId, mode) => {
        const alloc = draftAllocations.find(a => a.personId === personId);
        if (alloc) {
            alloc.mode = mode;
            if (mode === 'rateado') alloc.fixedValue = 0;
            const row = document.querySelector(`.allocation-row[data-person-id="${personId}"] .allocation-fixed-value`);
            if (row) row.style.visibility = mode === 'fixo' ? 'visible' : 'hidden';
        }
    };

    window.setFixedValue = (personId, value) => {
        const alloc = draftAllocations.find(a => a.personId === personId);
        if (alloc) alloc.fixedValue = parseFloat(value) || 0;
    };

    window.removeAllocation = (personId) => {
        draftAllocations = draftAllocations.filter(a => a.personId !== personId);
        document.getElementById('allocations-list').innerHTML = renderAllocationsList(personService.getAllPeople());
    };
}

function openContractModal(squads) {
    currentEditId = null;
    draftAllocations = [];
    document.getElementById('modal-title').textContent = 'Novo Contrato';
    document.getElementById('contract-form-body').innerHTML = renderContractForm(null, squads, storage.getCurrentPeriod());
    document.getElementById('contract-modal').classList.add('active');
    attachPersonSearch();
    setTimeout(() => attachClientAutocomplete(document.getElementById('client')), 50);
}

function editContract(id, squads) {
    currentEditId = id;
    const contract = contractService.getContract(id);
    document.getElementById('modal-title').textContent = 'Editar Contrato';
    document.getElementById('contract-form-body').innerHTML = renderContractForm(contract, squads, storage.getCurrentPeriod());
    document.getElementById('contract-modal').classList.add('active');
    attachPersonSearch();
    setTimeout(() => attachClientAutocomplete(document.getElementById('client')), 50);
}

function closeContractModal() {
    document.getElementById('contract-modal').classList.remove('active');
    currentEditId = null;
    draftAllocations = [];
}

function attachPersonSearch() {
    const input = document.getElementById('person-search');
    const results = document.getElementById('person-search-results');
    if (!input) return;

    input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        results.innerHTML = '';
        if (q.length < 1) { results.style.display = 'none'; return; }

        const allPeople = personService.getAllPeople();
        const already = new Set(draftAllocations.map(a => a.personId));
        const matches = allPeople.filter(p =>
            !already.has(p.id) && p.name.toLowerCase().includes(q)
        ).slice(0, 8);

        if (matches.length === 0) { results.style.display = 'none'; return; }

        results.style.display = 'block';
        results.innerHTML = matches.map(p => `
            <div class="person-search-item" data-id="${p.id}">
                <strong>${p.name}</strong> <span style="color:var(--text-secondary); font-size:0.85rem;">${p.role}</span>
            </div>
        `).join('');

        results.querySelectorAll('.person-search-item').forEach(item => {
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const personId = item.dataset.id;
                draftAllocations.push({ personId, mode: 'rateado', fixedValue: 0 });
                document.getElementById('allocations-list').innerHTML = renderAllocationsList(personService.getAllPeople());
                input.value = '';
                results.style.display = 'none';
            });
        });
    });

    input.addEventListener('blur', () => {
        setTimeout(() => { results.style.display = 'none'; }, 150);
    });
}

function saveContract() {
    try {
        const client      = document.getElementById('client').value.trim();
        const value       = parseFloat(document.getElementById('value').value);
        const duration    = parseInt(document.getElementById('duration').value) || 12;
        const startPeriod = document.getElementById('startPeriod').value || storage.getCurrentPeriod();
        const squadTag    = document.getElementById('squad-tag').value || null;
        const videoCount  = parseInt(document.getElementById('video-count').value) || 0;
        const staticCount = parseInt(document.getElementById('static-count').value) || 0;

        const formData = {
            client, value, duration, startPeriod, squadTag,
            videoCount, staticCount,
            peopleAllocations: draftAllocations.map(a => ({ ...a })),
            status: 'active',
        };

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

function duplicateContractPrompt(id) {
    const original = contractService.getContract(id);
    const newClient = prompt(`Duplicar contrato de "${original.client}".\n\nNome do novo cliente:`, original.client);
    if (newClient === null) return;
    try {
        contractService.duplicateContract(id, { client: newClient.trim() || original.client });
        renderContractsPage();
    } catch (error) {
        alert(error.message);
    }
}

function sortContractsBy(column) {
    if (sortColumn === column) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    else { sortColumn = column; sortDirection = 'asc'; }
    renderContractsPage();
}

function filterContracts() {
    const term = document.getElementById('contract-search').value.toLowerCase();
    document.querySelectorAll('#contracts-list tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
}

function exportContracts() {
    const contracts = contractService.getAllContracts();
    const blob = new Blob([JSON.stringify(contracts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contratos_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────

function contractStyles() {
    return `
        .form-step {
            background: var(--bg-darker);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 1.25rem;
        }
        .form-step-label {
            font-size: 0.78rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--fast-green, #7cfc00);
            margin-bottom: 1rem;
        }
        .person-search-dropdown {
            display: none;
            position: absolute;
            top: 100%; left: 0; right: 0;
            background: var(--bg-card, #1a1a1a);
            border: 1px solid var(--border);
            border-radius: 0 0 8px 8px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 50;
        }
        .person-search-item {
            padding: 0.6rem 0.875rem;
            cursor: pointer;
            border-bottom: 1px solid var(--border);
        }
        .person-search-item:hover { background: rgba(124,252,0,0.08); }

        .allocation-row {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            background: var(--bg-card, #1a1a1a);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 0.5rem;
        }
        .allocation-person { flex: 1; display:flex; flex-direction:column; }
        .allocation-role { font-size: 0.78rem; color: var(--text-secondary); }
        .allocation-mode { display: flex; gap: 0.75rem; font-size: 0.85rem; }
        .mode-toggle { display:flex; align-items:center; gap:0.3rem; cursor:pointer; }
        .allocation-fixed-value { display:flex; align-items:center; gap:0.3rem; }

        .breakdown-person-card {
            background: var(--bg-darker);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1rem;
        }
        .breakdown-person-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 0.5rem;
        }
        .badge-info { background: rgba(33,150,243,0.15); color: #64b5f6; }
    `;
}
