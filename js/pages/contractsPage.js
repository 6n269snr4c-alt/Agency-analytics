// contractsPage.js — v4
// Planilha única de contratos. Sem duração/data de início: cada contrato vale
// enquanto for confirmado mês a mês. Mudou algo de verdade (valor, squad,
// entregáveis, equipe)? Lança um contrato novo — "Lançar novo contrato" fecha
// o mês atual do antigo e abre um novo já confirmado, preservando o histórico.

import contractService from '../services/contractService.js';
import projectService from '../services/projectService.js';
import squadService from '../services/squadService.js';
import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';
import periodService from '../services/periodService.js';
import router from '../router.js';
import storage from '../store/storage.js';
import { attachClientAutocomplete } from '../components/clientAutocomplete.js';

const TEAM_ROLES = ['Designer', 'Filmmaker', 'Copywriter', 'Gestor de Tráfego'];
const MONTHS_VISIBLE = 6;

let selectedMonth   = null;
let showInactive    = false;
let viewLocked      = false;
let searchTerm      = '';

let currentEditId   = null;   // contrato sendo editado (modal de equipe)
let relaunchFromId  = null;   // contrato de origem ao "lançar novo a partir de"
let draftAllocations = [];

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(value) {
    return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function marginBadgeClass(margin) {
    if (margin >= 30) return 'badge-success';
    if (margin >= 15) return 'badge-warning';
    return 'badge-error';
}

function monthShortLabel(periodId) {
    const [, m] = periodId.split('-').map(Number);
    return ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][m - 1];
}

function getMonthOptions() {
    const current = storage.getCurrentPeriod();
    const months = [current];
    let cursor = current;
    for (let i = 1; i < MONTHS_VISIBLE; i++) {
        cursor = periodService.getPreviousPeriod(cursor);
        months.unshift(cursor);
    }
    return months;
}

function groupTeamByRole(contract, allPeople) {
    const groups = {};
    TEAM_ROLES.forEach(r => groups[r] = []);

    (contract.peopleAllocations || []).forEach(alloc => {
        const person = allPeople.find(p => p.id === alloc.personId);
        if (!person) return;
        if (!groups[person.role]) groups[person.role] = [];
        groups[person.role].push({ person, alloc });
    });

    return groups;
}

// ─── entry point ──────────────────────────────────────────────────────────────

export function renderContractsPage() {
    const contentEl = document.getElementById('content');

    if (!selectedMonth) selectedMonth = storage.getCurrentPeriod();

    const squads    = squadService.getAllSquads();
    const allPeople = personService.getAllPeople();

    let contracts = showInactive
        ? contractService.getAllContractsEver()
        : contractService.getContractsForPeriod(selectedMonth);

    let projects = showInactive
        ? projectService.getAllProjects()
        : projectService.getProjectsForPeriod(selectedMonth);

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        contracts = contracts.filter(c => c.client.toLowerCase().includes(term));
        projects = projects.filter(p => (p.client || p.name).toLowerCase().includes(term));
    }

    const recurringRevenue = contractService.getContractsForPeriod(selectedMonth)
        .reduce((sum, c) => sum + analyticsService.getContractROI(c.id, selectedMonth).revenue, 0);
    const oneOffRevenue = projectService.getProjectsForPeriod(selectedMonth)
        .reduce((sum, p) => sum + analyticsService.getProjectROI(p.id, selectedMonth).revenue, 0);

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Contratos</h1>
            <p class="page-subtitle">Confirme mês a mês os contratos que continuam iguais. Mudou algo? Lance um contrato novo.</p>
        </div>

        <div class="action-bar" style="flex-wrap:wrap; gap:0.75rem;">
            <div class="action-bar-left" style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="window.openContractModal()">+ Novo Contrato</button>
                <div style="display:flex; align-items:center; gap:0.4rem;">
                    <span style="font-size:0.78rem; color:var(--text-secondary);">Mês:</span>
                    ${getMonthOptions().map(p => `
                        <button class="month-pill ${p === selectedMonth ? 'active' : ''}" onclick="window.selectMonth('${p}')">${monthShortLabel(p)}</button>
                    `).join('')}
                    <button class="btn btn-secondary btn-small" style="margin-left:0.4rem;" onclick="window.changePeriod('${periodService.getNextPeriod(storage.getCurrentPeriod())}')" title="Avança o mês atual do sistema (afeta o app todo)">
                        Avançar mês ▸ ${monthShortLabel(periodService.getNextPeriod(storage.getCurrentPeriod()))}/${periodService.getNextPeriod(storage.getCurrentPeriod()).split('-')[0].slice(2)}
                    </button>
                </div>
                <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.82rem; color:var(--text-secondary); cursor:pointer;">
                    <input type="checkbox" id="show-inactive" ${showInactive ? 'checked' : ''} onchange="window.toggleShowInactive(this.checked)">
                    Mostrar inativos
                </label>
            </div>
            <div class="action-bar-right" style="display:flex; align-items:center; gap:0.6rem;">
                <input type="text" class="form-input" id="contract-search"
                       placeholder="🔍 Buscar cliente..." style="max-width:220px;"
                       value="${searchTerm}" oninput="window.filterContracts(this.value)">
                <button class="btn btn-secondary" onclick="window.toggleViewLock()" title="Trava todos os campos contra edição/cliques">
                    ${viewLocked ? '🔒 Travado' : '🔓 Destravado'}
                </button>
                <button class="btn btn-secondary" onclick="window.exportContracts()">📥 Exportar</button>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.5rem;">
            <div class="stat-card">
                <div class="stat-value">R$ ${fmt(recurringRevenue)}</div>
                <div class="stat-label">Receita Recorrência (${monthShortLabel(selectedMonth)}/${selectedMonth.split('-')[0].slice(2)})</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">R$ ${fmt(oneOffRevenue)}</div>
                <div class="stat-label">Receita Projetos Pontuais (${monthShortLabel(selectedMonth)}/${selectedMonth.split('-')[0].slice(2)})</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:var(--fast-green,#7cfc00);">R$ ${fmt(recurringRevenue + oneOffRevenue)}</div>
                <div class="stat-label">Total do Mês</div>
            </div>
        </div>

        <div id="contracts-list">
            ${renderContractsTable(contracts, projects, squads, allPeople)}
        </div>

        <!-- MODAL: NOVO / LANÇAR NOVO CONTRATO -->
        <div id="contract-modal" class="modal">
            <div class="modal-content" style="max-width: 720px;">
                <div class="modal-header">
                    <h2 class="modal-title" id="modal-title">Novo Contrato</h2>
                    <button class="modal-close" onclick="window.closeContractModal()">&times;</button>
                </div>
                <div id="contract-form-body"></div>
            </div>
        </div>

        <!-- MODAL: EQUIPE -->
        <div id="team-modal" class="modal">
            <div class="modal-content" style="max-width: 560px;">
                <div class="modal-header">
                    <h2 class="modal-title" id="team-modal-title">Equipe do contrato</h2>
                    <button class="modal-close" onclick="window.closeTeamModal()">&times;</button>
                </div>
                <div id="team-form-body"></div>
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

    attachContractHandlers();
    document.querySelectorAll('.inline-client-input').forEach(el => attachClientAutocomplete(el));
}

// ─── TABELA ───────────────────────────────────────────────────────────────────

function renderContractsTable(contracts, projects, squads, allPeople) {
    if (contracts.length === 0 && projects.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>Nenhum contrato ou projeto${showInactive ? '' : ' ativo neste mês'}</h3>
                <p>${showInactive ? 'Comece criando seu primeiro contrato' : 'Marque "Mostrar inativos" para ver todos, ou crie um novo contrato'}</p>
            </div>
        `;
    }

    const months = getMonthOptions();
    const currentPeriod = storage.getCurrentPeriod();

    const contractRows = contracts.map(contract => {
        const roi   = analyticsService.getContractROI(contract.id, selectedMonth);
        const squad = contract.squadTag ? squadService.getSquad(contract.squadTag) : null;
        const locked = contractService.isLockedByHistory(contract.id, currentPeriod);
        const confirmedThisMonth = (contract.confirmedPeriods || []).includes(selectedMonth);
        const lastConfirmed = contractService.getLastConfirmedPeriod(contract.id);
        const team = groupTeamByRole(contract, allPeople);
        const head = squad && squad.headId ? allPeople.find(p => p.id === squad.headId) : null;
        const headCost = roi.costBreakdown.find(c => c.isHead);
        return { type: 'contract', clientKey: contract.client, contract, roi, squad, locked, confirmedThisMonth, lastConfirmed, team, head, headCost };
    });

    const projectRows = projects.map(project => {
        const roi   = analyticsService.getProjectROI(project.id, selectedMonth);
        const squad = project.squadId ? squadService.getSquad(project.squadId) : null;
        const head  = squad && squad.headId ? allPeople.find(p => p.id === squad.headId) : null;
        const headCost = roi.costBreakdown.find(c => c.isHead);
        const clientKey = project.client || project.name;
        return { type: 'project', clientKey, project, roi, squad, head, headCost };
    });

    const rows = [...contractRows, ...projectRows]
        .sort((a, b) => a.clientKey.toLowerCase().localeCompare(b.clientKey.toLowerCase()));

    return `
        <div class="table-container" style="overflow-x:auto;">
            <table class="itable">
                <thead>
                    <tr>
                        <th style="position:sticky; left:0; background:var(--bg-darker, #15151a); z-index:2;">Cliente</th>
                        <th>Squad</th>
                        <th>🎬 Vídeo</th>
                        <th>🖼️ Estático</th>
                        <th>Tráfego</th>
                        <th>Head</th>
                        <th>Designer</th>
                        <th>Filmmaker</th>
                        <th>Copywriter</th>
                        <th>Gestor Tráfego</th>
                        <th>Receita</th>
                        <th>Custo</th>
                        <th>Margem</th>
                        <th>Último mês</th>
                        <th>Meses</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => r.type === 'contract' ? renderRow(r, squads, months) : renderProjectRow(r)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderRow({ contract, roi, squad, locked, confirmedThisMonth, lastConfirmed, team, head, headCost }, squads, months) {
    const disabled = viewLocked || locked;
    const fieldDisabled = viewLocked; // campos sempre travados? não — abaixo cada campo decide
    const rowMuted = !confirmedThisMonth;

    return `
        <tr class="${rowMuted ? 'row-inactive' : ''}">
            <td style="position:sticky; left:0; background:${rowMuted ? 'var(--bg-darker,#15151a)' : 'var(--bg,#0f0f12)'};">
                <input type="text" class="inline-input inline-client-input" value="${contract.client}"
                       ${viewLocked ? 'disabled' : ''}
                       onchange="window.updateField('${contract.id}','client',this.value)">
            </td>
            <td>
                <select class="inline-input" ${viewLocked || locked ? 'disabled' : ''} onchange="window.updateField('${contract.id}','squadTag',this.value)">
                    <option value="">—</option>
                    ${squads.map(s => `<option value="${s.id}" ${contract.squadTag === s.id ? 'selected' : ''}>${s.icon || ''} ${s.name}</option>`).join('')}
                </select>
            </td>
            <td style="text-align:center;">
                <input type="number" min="0" class="inline-input inline-input-num" value="${contract.videoCount || 0}"
                       ${viewLocked || locked ? 'disabled' : ''}
                       onchange="window.updateField('${contract.id}','videoCount',this.value)">
            </td>
            <td style="text-align:center;">
                <input type="number" min="0" class="inline-input inline-input-num" value="${contract.staticCount || 0}"
                       ${viewLocked || locked ? 'disabled' : ''}
                       onchange="window.updateField('${contract.id}','staticCount',this.value)">
            </td>
            <td style="text-align:center;">
                <button class="traffic-pill ${contract.trafficManagement ? 'on' : ''}"
                        ${viewLocked || locked ? 'disabled' : ''}
                        onclick="window.toggleTraffic('${contract.id}', ${!contract.trafficManagement})">
                    ${contract.trafficManagement ? 'Sim' : 'Não'}
                </button>
            </td>
            <td>${head ? `<span class="role-chip"><span class="role-chip-avatar">${head.name[0]}</span>${head.name}<span class="role-chip-badge auto">auto</span></span>` : '<span class="text-muted">—</span>'}
                ${headCost ? `<div class="role-chip-cost">R$ ${fmt(headCost.totalCost)}</div>` : ''}
            </td>
            ${TEAM_ROLES.map(role => renderTeamCell(contract, team[role], role, locked || viewLocked)).join('')}
            <td style="text-align:right;">
                <input type="number" min="0" step="0.01" class="inline-input inline-input-num" style="width:90px;" value="${contract.value}"
                       ${viewLocked || locked ? 'disabled' : ''}
                       onchange="window.updateField('${contract.id}','value',this.value)">
            </td>
            <td style="text-align:right; color:var(--text-secondary);">R$ ${fmt(roi.cost)}</td>
            <td style="text-align:center;"><span class="badge ${marginBadgeClass(roi.margin)}">${roi.margin.toFixed(0)}%</span></td>
            <td style="text-align:center; font-size:0.8rem; color:var(--text-secondary);">${lastConfirmed ? monthShortLabel(lastConfirmed) + '/' + lastConfirmed.split('-')[0].slice(2) : '—'}</td>
            <td style="text-align:center; white-space:nowrap;">
                ${months.map(m => `
                    <span class="month-sq ${(contract.confirmedPeriods || []).includes(m) ? 'checked' : ''} ${m === selectedMonth ? 'ref' : ''}"
                          title="${monthShortLabel(m)}"
                          onclick="${viewLocked ? '' : `window.toggleMonth('${contract.id}','${m}')`}">${(contract.confirmedPeriods || []).includes(m) ? '✓' : ''}</span>
                `).join('')}
            </td>
            <td style="white-space:nowrap;">
                <div style="display:flex; gap:0.3rem; justify-content:center;">
                    <button class="btn btn-small btn-primary" onclick="window.showContractBreakdown('${contract.id}')" title="Ver cálculo">🔍</button>
                    ${locked
                        ? `<button class="btn btn-small btn-secondary" ${viewLocked ? 'disabled' : ''} onclick="window.openRelaunchModal('${contract.id}')" title="Algo mudou — lançar novo contrato">🔁</button>`
                        : `
                            <button class="btn btn-small btn-secondary" ${viewLocked ? 'disabled' : ''} onclick="window.openTeamModal('${contract.id}')" title="Editar equipe">👥</button>
                            ${(contract.confirmedPeriods || []).length === 0
                                ? `<button class="btn btn-small btn-error" ${viewLocked ? 'disabled' : ''} onclick="window.deleteContract('${contract.id}')" title="Excluir rascunho">🗑️</button>`
                                : ''}
                        `}
                </div>
            </td>
        </tr>
    `;
}

function renderProjectRow({ project, roi, squad, head, headCost }) {
    const rowMuted = project.billingPeriod !== selectedMonth;
    const periodLabel = project.billingPeriod
        ? monthShortLabel(project.billingPeriod) + '/' + project.billingPeriod.split('-')[0].slice(2)
        : '—';

    return `
        <tr class="${rowMuted ? 'row-inactive' : ''}">
            <td style="position:sticky; left:0; background:${rowMuted ? 'var(--bg-darker,#15151a)' : 'var(--bg,#0f0f12)'};">
                <span class="project-badge" title="Projeto pontual — lançado/editado na tela de Projetos">🚀</span>
                ${project.client || project.name}
                ${project.client ? `<div style="font-size:0.7rem; color:var(--text-secondary);">${project.name}</div>` : ''}
            </td>
            <td>${squad ? `${squad.icon || ''} ${squad.name}` : '<span class="text-muted">—</span>'}</td>
            <td style="text-align:center;" class="text-muted">—</td>
            <td style="text-align:center;" class="text-muted">—</td>
            <td style="text-align:center;" class="text-muted">—</td>
            <td>${head ? `<span class="role-chip"><span class="role-chip-avatar">${head.name[0]}</span>${head.name}<span class="role-chip-badge auto">auto</span></span>` : '<span class="text-muted">—</span>'}
                ${headCost ? `<div class="role-chip-cost">R$ ${fmt(headCost.totalCost)}</div>` : ''}
            </td>
            <td class="text-muted" style="text-align:center;">—</td>
            <td class="text-muted" style="text-align:center;">—</td>
            <td class="text-muted" style="text-align:center;">—</td>
            <td class="text-muted" style="text-align:center;">—</td>
            <td style="text-align:right;">R$ ${fmt(roi.revenue)}</td>
            <td style="text-align:right; color:var(--text-secondary);">R$ ${fmt(roi.cost)}</td>
            <td style="text-align:center;"><span class="badge ${marginBadgeClass(roi.margin)}">${roi.margin.toFixed(0)}%</span></td>
            <td style="text-align:center; font-size:0.8rem; color:var(--text-secondary);">${periodLabel}</td>
            <td style="text-align:center;"><span class="project-pill">🚀 Pontual</span></td>
            <td style="white-space:nowrap;">
                <div style="display:flex; gap:0.3rem; justify-content:center;">
                    <button class="btn btn-small btn-primary" onclick="window.showProjectBreakdown('${project.id}')" title="Ver cálculo">🔍</button>
                    <button class="btn btn-small btn-secondary" onclick="window.goToProject('${project.id}')" title="Editar na tela de Projetos">✏️</button>
                </div>
            </td>
        </tr>
    `;
}

function renderTeamCell(contract, entries, role, locked) {
    if (!entries || entries.length === 0) {
        return `<td>${locked ? '<span class="text-muted">—</span>' : `<button class="role-chip-add" onclick="window.openTeamModal('${contract.id}')">+ adicionar</button>`}</td>`;
    }
    return `<td>${entries.map(({ person, alloc }) => `
        <span class="role-chip" ${locked ? '' : `onclick="window.openTeamModal('${contract.id}')" style="cursor:pointer;"`}>
            <span class="role-chip-avatar">${person.name[0]}</span>${person.name}
            <span class="role-chip-badge ${alloc.mode === 'fixo' ? 'fixo' : 'rateado'}">${alloc.mode === 'fixo' ? 'fixo' : 'rateado'}</span>
        </span>
    `).join('')}</td>`;
}

// ─── MODAL: NOVO / LANÇAR NOVO CONTRATO ───────────────────────────────────────

function renderContractForm(prefill, squads) {
    draftAllocations = prefill ? (prefill.peopleAllocations || []).map(a => ({ ...a })) : [];

    return `
        <div style="padding: 1.5rem; display:flex; flex-direction:column; gap:1.5rem;">
            <div class="form-step">
                <div class="form-step-label">1. Cliente e contrato</div>
                <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">Cliente *</label>
                        <input type="text" class="form-input" id="client" required
                               value="${prefill?.client || ''}"
                               placeholder="Digite ou selecione um cliente existente">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">Valor Mensal (R$) *</label>
                        <input type="number" class="form-input" id="value" step="0.01" required
                               value="${prefill?.value ?? ''}">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">Squad</label>
                        <select class="form-select" id="squad-tag">
                            <option value="">Nenhum</option>
                            ${squads.map(s => `<option value="${s.id}" ${prefill?.squadTag === s.id ? 'selected' : ''}>${s.icon||''} ${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin:0; display:flex; align-items:flex-end;">
                        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="checkbox" id="traffic-management" ${prefill?.trafficManagement ? 'checked' : ''}>
                            Inclui gestão de tráfego
                        </label>
                    </div>
                </div>
            </div>

            <div class="form-step">
                <div class="form-step-label">2. Volume de entregas no mês</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">🎬 Conteúdo em Vídeo</label>
                        <input type="number" class="form-input" id="video-count" min="0" step="1"
                               value="${prefill?.videoCount || 0}">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">🖼️ Conteúdo Estático</label>
                        <input type="number" class="form-input" id="static-count" min="0" step="1"
                               value="${prefill?.staticCount || 0}">
                    </div>
                </div>
            </div>

            <div class="form-step">
                <div class="form-step-label">3. Equipe atribuída</div>
                <div style="position:relative; margin-bottom: 1rem;">
                    <input type="text" class="form-input" id="person-search"
                           placeholder="🔍 Buscar pessoa para adicionar...">
                    <div id="person-search-results" class="person-search-dropdown"></div>
                </div>
                <div id="allocations-list">${renderAllocationsList(personService.getAllPeople())}</div>
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
        const matches = allPeople.filter(p => !already.has(p.id) && p.name.toLowerCase().includes(q)).slice(0, 8);

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

function openContractModal() {
    currentEditId = null;
    relaunchFromId = null;
    document.getElementById('modal-title').textContent = 'Novo Contrato';
    document.getElementById('contract-form-body').innerHTML = renderContractForm(null, squadService.getAllSquads());
    document.getElementById('contract-modal').classList.add('active');
    attachPersonSearch();
    setTimeout(() => attachClientAutocomplete(document.getElementById('client')), 50);
}

function openRelaunchModal(id) {
    const original = contractService.getContract(id);
    relaunchFromId = id;
    currentEditId = null;
    document.getElementById('modal-title').textContent = `Lançar novo contrato — ${original.client}`;
    document.getElementById('contract-form-body').innerHTML = renderContractForm(original, squadService.getAllSquads());
    document.getElementById('contract-modal').classList.add('active');
    attachPersonSearch();
    setTimeout(() => attachClientAutocomplete(document.getElementById('client')), 50);
}

function closeContractModal() {
    document.getElementById('contract-modal').classList.remove('active');
    currentEditId = null;
    relaunchFromId = null;
    draftAllocations = [];
}

function saveContract() {
    try {
        const client      = document.getElementById('client').value.trim();
        const value       = parseFloat(document.getElementById('value').value);
        const squadTag    = document.getElementById('squad-tag').value || null;
        const videoCount  = parseInt(document.getElementById('video-count').value) || 0;
        const staticCount = parseInt(document.getElementById('static-count').value) || 0;
        const trafficManagement = document.getElementById('traffic-management').checked;

        const formData = {
            client, value, squadTag, videoCount, staticCount, trafficManagement,
            peopleAllocations: draftAllocations.map(a => ({ ...a })),
        };

        if (relaunchFromId) {
            contractService.duplicateContract(relaunchFromId, formData);
        } else {
            contractService.createContract(formData);
        }

        closeContractModal();
        renderContractsPage();
    } catch (error) {
        alert(error.message);
    }
}

// ─── MODAL: EQUIPE (contrato ainda sem histórico) ─────────────────────────────

function openTeamModal(contractId) {
    const contract = contractService.getContract(contractId);
    currentEditId = contractId;
    draftAllocations = (contract.peopleAllocations || []).map(a => ({ ...a }));

    document.getElementById('team-modal-title').textContent = `Equipe — ${contract.client}`;
    document.getElementById('team-form-body').innerHTML = `
        <div style="padding: 1.5rem;">
            <div style="position:relative; margin-bottom: 1rem;">
                <input type="text" class="form-input" id="team-person-search"
                       placeholder="🔍 Buscar pessoa para adicionar...">
                <div id="team-person-search-results" class="person-search-dropdown"></div>
            </div>
            <div id="team-allocations-list">${renderAllocationsList(personService.getAllPeople())}</div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="window.closeTeamModal()">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="window.saveTeam()">💾 Salvar Equipe</button>
            </div>
        </div>
    `;
    document.getElementById('team-modal').classList.add('active');
    attachTeamPersonSearch();
}

function attachTeamPersonSearch() {
    const input = document.getElementById('team-person-search');
    const results = document.getElementById('team-person-search-results');
    if (!input) return;

    input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        results.innerHTML = '';
        if (q.length < 1) { results.style.display = 'none'; return; }

        const allPeople = personService.getAllPeople();
        const already = new Set(draftAllocations.map(a => a.personId));
        const matches = allPeople.filter(p => !already.has(p.id) && p.name.toLowerCase().includes(q)).slice(0, 8);

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
                document.getElementById('team-allocations-list').innerHTML = renderAllocationsList(personService.getAllPeople());
                input.value = '';
                results.style.display = 'none';
            });
        });
    });

    input.addEventListener('blur', () => {
        setTimeout(() => { results.style.display = 'none'; }, 150);
    });
}

function closeTeamModal() {
    document.getElementById('team-modal').classList.remove('active');
    currentEditId = null;
    draftAllocations = [];
}

function saveTeam() {
    try {
        contractService.updateContract(currentEditId, { peopleAllocations: draftAllocations.map(a => ({ ...a })) });
        closeTeamModal();
        renderContractsPage();
    } catch (error) {
        alert(error.message);
    }
}

// ─── BREAKDOWN ────────────────────────────────────────────────────────────────

function renderBreakdownItem(item) {
    if (item.mode === 'externo') {
        return `
            <div class="breakdown-person-card">
                <div class="breakdown-person-header">
                    <strong>${item.name}</strong>
                    <span class="badge" style="background:rgba(244,67,54,0.15); color:#f44336;">Custo Externo</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-secondary);">Informado no lançamento do projeto</div>
                <div style="margin-top:0.5rem; font-size:1.1rem; font-weight:700; color:var(--fast-green,#7cfc00);">R$ ${fmt(item.totalCost)}</div>
            </div>
        `;
    }
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
                <div style="font-size:0.85rem; color:var(--text-secondary);">Rateado igualmente entre os clientes do squad (contratos + projetos)</div>
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
}

function showContractBreakdown(contractId) {
    const contract = contractService.getContract(contractId);
    const roi = analyticsService.getContractROI(contractId, selectedMonth);

    document.getElementById('breakdown-title').textContent = `Detalhamento: ${contract.client} (${monthShortLabel(selectedMonth)}/${selectedMonth.split('-')[0].slice(2)})`;

    const volumeHtml = `
        <div style="background:var(--bg-darker); padding:1rem; border-radius:8px; margin-bottom:1.5rem; display:flex; gap:2rem;">
            <div><span style="color:var(--text-secondary); font-size:0.8rem;">🎬 Vídeo</span><br><strong style="font-size:1.2rem;">${roi.videoCount}</strong></div>
            <div><span style="color:var(--text-secondary); font-size:0.8rem;">🖼️ Estático</span><br><strong style="font-size:1.2rem;">${roi.staticCount}</strong></div>
        </div>
    `;

    const peopleHtml = roi.costBreakdown.map(renderBreakdownItem).join('');

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

function showProjectBreakdown(projectId) {
    const project = projectService.getProjectById(projectId);
    const roi = analyticsService.getProjectROI(projectId, selectedMonth);

    document.getElementById('breakdown-title').textContent = `Detalhamento: ${project.name} (projeto pontual${project.client ? ' — ' + project.client : ''})`;

    const peopleHtml = roi.costBreakdown.map(renderBreakdownItem).join('');
    const hasCostItems = roi.costBreakdown.length > 0;

    const summaryHtml = `
        <div style="background:var(--bg-darker); padding:1.25rem; border-radius:8px; border:2px solid ${roi.profit > 0 ? 'var(--fast-green,#7cfc00)' : 'var(--error,#f44336)'}; margin-top:${hasCostItems ? '1.5rem' : '0'};">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;"><span>Receita</span><strong>R$ ${fmt(roi.revenue)}</strong></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;"><span>Custo Total</span><strong style="color:var(--error,#f44336)">R$ ${fmt(roi.cost)}</strong></div>
            <div style="display:flex; justify-content:space-between; padding-top:0.5rem; border-top:1px solid var(--border);">
                <span style="font-weight:700;">Lucro</span>
                <strong style="color:${roi.profit > 0 ? 'var(--fast-green,#7cfc00)' : 'var(--error,#f44336)'}; font-size:1.2rem;">R$ ${fmt(roi.profit)} (${roi.margin.toFixed(1)}%)</strong>
            </div>
        </div>
    `;

    document.getElementById('breakdown-content').innerHTML =
        (hasCostItems ? `<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:1rem;">${peopleHtml}</div>` : '') +
        summaryHtml;
    document.getElementById('breakdown-modal').classList.add('active');
}

function closeBreakdownModal() {
    document.getElementById('breakdown-modal').classList.remove('active');
}

function goToProject(projectId) {
    router.navigate('/projects');
    setTimeout(() => {
        if (typeof window.editProject === 'function') window.editProject(projectId);
    }, 80);
}

// ─── HANDLERS ─────────────────────────────────────────────────────────────────

function attachContractHandlers() {
    window.openContractModal  = openContractModal;
    window.openRelaunchModal  = openRelaunchModal;
    window.closeContractModal = closeContractModal;
    window.saveContract       = saveContract;

    window.openTeamModal  = openTeamModal;
    window.closeTeamModal = closeTeamModal;
    window.saveTeam       = saveTeam;

    window.deleteContract     = (id) => {
        if (confirm('Excluir este rascunho de contrato? Ele nunca foi confirmado em nenhum mês.')) {
            contractService.deleteContract(id);
            renderContractsPage();
        }
    };

    window.exportContracts = () => {
        const contracts = contractService.getAllContractsEver();
        const blob = new Blob([JSON.stringify(contracts, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contratos_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    window.showContractBreakdown = showContractBreakdown;
    window.showProjectBreakdown  = showProjectBreakdown;
    window.goToProject           = goToProject;
    window.closeBreakdownModal   = closeBreakdownModal;

    window.selectMonth = (periodId) => { selectedMonth = periodId; renderContractsPage(); };
    window.toggleShowInactive = (checked) => { showInactive = checked; renderContractsPage(); };
    window.toggleViewLock = () => { viewLocked = !viewLocked; renderContractsPage(); };
    window.filterContracts = (value) => { searchTerm = value; renderContractsPage(); };

    window.toggleMonth = (contractId, periodId) => {
        const contract = contractService.getContract(contractId);
        const isConfirmed = (contract.confirmedPeriods || []).includes(periodId);
        if (isConfirmed) contractService.unconfirmPeriod(contractId, periodId);
        else contractService.confirmPeriod(contractId, periodId);
        renderContractsPage();
    };

    window.toggleTraffic = (contractId, value) => {
        contractService.updateContract(contractId, { trafficManagement: value });
        renderContractsPage();
    };

    window.updateField = (contractId, field, value) => {
        const updates = {};
        updates[field] = value;
        try {
            contractService.updateContract(contractId, updates);
        } catch (error) {
            alert(error.message);
        }
        renderContractsPage();
    };

    window.setAllocationMode = (personId, mode) => {
        const alloc = draftAllocations.find(a => a.personId === personId);
        if (alloc) {
            alloc.mode = mode;
            if (mode === 'rateado') alloc.fixedValue = 0;
        }
        const list = document.getElementById('team-allocations-list') || document.getElementById('allocations-list');
        if (list) list.innerHTML = renderAllocationsList(personService.getAllPeople());
    };

    window.setFixedValue = (personId, value) => {
        const alloc = draftAllocations.find(a => a.personId === personId);
        if (alloc) alloc.fixedValue = parseFloat(value) || 0;
    };

    window.removeAllocation = (personId) => {
        draftAllocations = draftAllocations.filter(a => a.personId !== personId);
        const list = document.getElementById('team-allocations-list') || document.getElementById('allocations-list');
        if (list) list.innerHTML = renderAllocationsList(personService.getAllPeople());
    };
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

        .month-pill {
            font-size: 0.78rem;
            padding: 0.3rem 0.7rem;
            border-radius: 14px;
            border: 1px solid var(--border);
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
        }
        .month-pill.active {
            background: rgba(124,252,0,0.12);
            border-color: var(--fast-green, #7cfc00);
            color: var(--fast-green, #7cfc00);
            font-weight: 700;
        }

        .itable { border-collapse: collapse; font-size: 0.82rem; white-space: nowrap; }
        .itable th, .itable td { padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--border); }
        .itable th { text-align:left; background: var(--bg-darker, #15151a); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary); }
        .itable tr.row-inactive { opacity: 0.55; }

        .inline-input {
            background: transparent;
            border: none;
            border-bottom: 1px dashed var(--border);
            border-radius: 4px 4px 0 0;
            color: var(--text-primary, #fff);
            padding: 0.3rem 0.4rem;
            font-size: 0.82rem;
            width: 100%;
            cursor: text;
        }
        .inline-input:hover:not(:disabled) { background: rgba(124,252,0,0.06); border-bottom-color: var(--fast-green, #7cfc00); }
        .inline-input:focus:not(:disabled) { border-bottom: 1px solid var(--fast-green, #7cfc00); outline: none; background: var(--bg-card, #1a1a1a); }
        .inline-input:disabled { color: var(--text-secondary); cursor: default; border-bottom-color: transparent; }
        select.inline-input { cursor: pointer; }
        .inline-input-num { text-align: center; width: 56px; }

        .traffic-pill {
            font-size: 0.75rem;
            padding: 0.2rem 0.7rem;
            border-radius: 10px;
            border: 1px solid var(--border);
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
        }
        .traffic-pill.on { background: rgba(33,150,243,0.15); border-color: #64b5f6; color: #64b5f6; }
        .traffic-pill:disabled { cursor: default; opacity: 0.7; }

        .role-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            font-size: 0.74rem;
            background: var(--bg-card, #1a1a1a);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 0.15rem 0.5rem 0.15rem 0.15rem;
            margin: 0.1rem 0.15rem;
        }
        .role-chip-avatar {
            width: 16px; height: 16px; border-radius: 50%;
            background: var(--bg-darker, #15151a);
            display: inline-flex; align-items:center; justify-content:center;
            font-size: 0.65rem; font-weight: 700;
        }
        .role-chip-badge { font-size: 0.62rem; padding: 0 0.3rem; border-radius: 6px; }
        .role-chip-badge.auto { color: var(--text-secondary); }
        .role-chip-badge.rateado { background: rgba(33,150,243,0.15); color: #64b5f6; }
        .role-chip-badge.fixo { background: rgba(255,160,0,0.15); color: #ff9800; }
        .role-chip-cost { font-size: 0.68rem; color: var(--text-secondary); margin-top: 0.1rem; }
        .role-chip-add {
            font-size: 0.72rem; color: var(--text-secondary);
            background: transparent; border: 1px dashed var(--border); border-radius: 10px;
            padding: 0.15rem 0.5rem; cursor: pointer;
        }
        .text-muted { color: var(--text-secondary); }

        .month-sq {
            display: inline-flex; align-items:center; justify-content:center;
            width: 20px; height: 20px; margin: 0 1px;
            border-radius: 4px; border: 1px solid var(--border);
            font-size: 0.68rem; cursor: pointer;
            color: var(--fast-green, #7cfc00);
        }
        .month-sq.checked { background: rgba(124,252,0,0.15); border-color: var(--fast-green, #7cfc00); }
        .month-sq.ref { border-color: #64b5f6; }

        .project-badge {
            display: inline-block;
            font-size: 0.85rem;
            margin-right: 0.25rem;
        }
        .project-pill {
            font-size: 0.68rem;
            padding: 0.15rem 0.5rem;
            border-radius: 10px;
            background: rgba(124,252,0,0.1);
            border: 1px solid rgba(124,252,0,0.3);
            color: var(--fast-green, #7cfc00);
            white-space: nowrap;
        }
    `;
}
