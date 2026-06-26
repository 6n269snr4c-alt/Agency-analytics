// simulatorPage.js - Simulador de Margem
// Simula o custo MARGINAL de um contrato hipotético (somado ao que já
// existe hoje) usando a mesma matemática de rateio do sistema real, e
// compara a margem resultante com a do squad escolhido e da agência toda.

import analyticsService from '../services/analyticsService.js';
import squadService from '../services/squadService.js';
import personService from '../services/personService.js';
import storage from '../store/storage.js';

let draft = {
    squadId: null,
    clientMode: 'new',
    existingContractId: '',
    value: '',
    videoCount: '',
    staticCount: '',
    trafficManagement: false,
    founderBrand: false,
    selectedPeople: [], // [{ personId, mode: 'rateado'|'fixo', fixedValue }]
};

let lastResult = null;

export function renderSimulatorPage() {
    const contentEl = document.getElementById('content');
    const squads = squadService.getAllSquads();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">🧮 Simulador de Margem</h1>
            <p class="page-subtitle">Simule um contrato hipotético e veja a margem real, comparada com o squad e com a Fast inteira</p>
        </div>

        <div class="sim-layout">
            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">Parâmetros do contrato</h2></div>
                <div class="widget-body">

                    <div class="form-group">
                        <label class="form-label">Squad *</label>
                        <select class="form-select" id="sim-squad" onchange="window.simChangeSquad(this.value)">
                            <option value="">Selecione...</option>
                            ${squads.map(s => `<option value="${s.id}" ${draft.squadId === s.id ? 'selected' : ''}>${s.icon || ''} ${s.name}</option>`).join('')}
                        </select>
                    </div>

                    ${draft.squadId ? renderClientModeFields(draft.squadId) : ''}

                    <div class="form-group">
                        <label class="form-label">Valor do contrato (R$) *</label>
                        <input type="number" class="form-input" id="sim-value" min="0" step="0.01" value="${draft.value}" oninput="window.simUpdateField('value', this.value)">
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                        <div class="form-group">
                            <label class="form-label">Nº de vídeos</label>
                            <input type="number" class="form-input" id="sim-video" min="0" value="${draft.videoCount}" oninput="window.simUpdateField('videoCount', this.value)">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Nº de estáticos</label>
                            <input type="number" class="form-input" id="sim-static" min="0" value="${draft.staticCount}" oninput="window.simUpdateField('staticCount', this.value)">
                        </div>
                    </div>

                    <div style="display:flex; gap:1.5rem; margin:0.5rem 0 1.25rem;">
                        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="checkbox" id="sim-traffic" ${draft.trafficManagement ? 'checked' : ''} onchange="window.simToggleField('trafficManagement', this.checked)">
                            📣 Gestão de tráfego
                        </label>
                        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="checkbox" id="sim-fb" ${draft.founderBrand ? 'checked' : ''} onchange="window.simToggleField('founderBrand', this.checked)">
                            🎤 Founder Brand
                        </label>
                    </div>

                    ${draft.squadId ? renderPeoplePicker(draft.squadId) : ''}

                    <button class="btn btn-primary" style="width:100%; margin-top:1rem;" onclick="window.simRun()" ${draft.squadId && draft.value ? '' : 'disabled'}>
                        🧮 Simular
                    </button>
                </div>
            </div>

            <div class="widget">
                <div class="widget-header"><h2 class="widget-title">Resultado</h2></div>
                <div class="widget-body" id="sim-result">
                    ${lastResult ? renderResult(lastResult) : `
                        <div class="empty-state">
                            <div class="empty-state-icon">🧮</div>
                            <p>Preencha os parâmetros e clique em Simular</p>
                        </div>
                    `}
                </div>
            </div>
        </div>

        <style>${simulatorStyles()}</style>
    `;

    attachSimulatorHandlers();
}

// ─── Campos de modo de cliente ─────────────────────────────────────────────

function renderClientModeFields(squadId) {
    const existingContracts = getSquadContracts(squadId);

    return `
        <div class="form-group">
            <label class="form-label">Esse contrato é de um...</label>
            <div style="display:flex; gap:1rem;">
                <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
                    <input type="radio" name="sim-client-mode" value="new" ${draft.clientMode === 'new' ? 'checked' : ''} onchange="window.simSetClientMode('new')">
                    Cliente novo
                </label>
                <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
                    <input type="radio" name="sim-client-mode" value="existing" ${draft.clientMode === 'existing' ? 'checked' : ''} onchange="window.simSetClientMode('existing')" ${existingContracts.length === 0 ? 'disabled' : ''}>
                    Cliente que já existe (editar um contrato real) ${existingContracts.length === 0 ? '— squad sem contratos ainda' : ''}
                </label>
            </div>
        </div>

        ${draft.clientMode === 'existing' && existingContracts.length > 0 ? `
            <div class="form-group">
                <label class="form-label">Qual contrato você quer editar?</label>
                <select class="form-select" id="sim-existing-contract" onchange="window.simLoadExistingContract(this.value)">
                    <option value="">Selecione...</option>
                    ${existingContracts.map(c => `<option value="${c.id}" ${draft.existingContractId === c.id ? 'selected' : ''}>${c.client} — R$ ${fmt(c.value)}</option>`).join('')}
                </select>
                <p style="font-size:0.78rem; color:var(--text-secondary); margin-top:0.4rem;">
                    Os campos abaixo vêm preenchidos com os dados reais desse contrato — ajuste o que quiser e simule.
                </p>
            </div>
        ` : ''}
    `;
}

function getSquadContracts(squadId) {
    const currentPeriod = storage.getCurrentPeriod();
    return storage.getActiveContractsForPeriod(currentPeriod).filter(c => c.squadTag === squadId);
}

// ─── Seletor de pessoas ─────────────────────────────────────────────────────

function renderPeoplePicker(squadId) {
    const members = squadService.getSquadMembers(squadId);
    if (members.length === 0) {
        return `<div class="form-group"><p style="color:var(--text-secondary); font-size:0.85rem;">Esse squad ainda não tem membros cadastrados.</p></div>`;
    }

    return `
        <div class="form-group">
            <label class="form-label">Quem participaria?</label>
            <div class="sim-people-list">
                ${members.map(p => {
                    const entry = draft.selectedPeople.find(sel => sel.personId === p.id);
                    const isSelected = !!entry;
                    return `
                    <div class="sim-people-item-wrap">
                        <label class="sim-people-item">
                            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="window.simTogglePerson('${p.id}', this.checked)">
                            ${p.name}
                            <span class="sim-people-role">${p.role}</span>
                            ${p.role === 'Copywriter' && (p.founderBrandPercent || 0) > 0 ? `<span class="sim-people-fb">FB ${p.founderBrandPercent}%</span>` : ''}
                        </label>
                        ${isSelected ? `
                            <div class="sim-people-mode">
                                <label>
                                    <input type="radio" name="sim-mode-${p.id}" value="rateado" ${entry.mode === 'rateado' ? 'checked' : ''} onchange="window.simSetPersonMode('${p.id}', 'rateado')">
                                    Rateado
                                </label>
                                <label>
                                    <input type="radio" name="sim-mode-${p.id}" value="fixo" ${entry.mode === 'fixo' ? 'checked' : ''} onchange="window.simSetPersonMode('${p.id}', 'fixo')">
                                    Valor fixo
                                </label>
                                ${entry.mode === 'fixo' ? `
                                    <span style="display:flex; align-items:center; gap:0.3rem;">
                                        R$ <input type="number" class="form-input sim-fixed-input" min="0" step="0.01" value="${entry.fixedValue || ''}" placeholder="0,00" oninput="window.simSetPersonFixedValue('${p.id}', this.value)">
                                    </span>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
                }).join('')}
            </div>
            <p style="font-size:0.78rem; color:var(--text-secondary); margin-top:0.5rem;">O Head do squad e a Head Master (se houver) entram automaticamente — não precisa selecionar.</p>
        </div>
    `;
}

// ─── Resultado ──────────────────────────────────────────────────────────────

function renderResult(result) {
    const marginClass = result.margin >= 30 ? 'good' : result.margin >= 15 ? 'ok' : 'bad';

    const compareLine = (label, diff) => {
        const isAbove = diff >= 0;
        return `
            <div class="sim-compare-row">
                <span>${label}</span>
                <span class="${isAbove ? 'sim-above' : 'sim-below'}">
                    ${isAbove ? '▲ acima' : '▼ abaixo'} em ${Math.abs(diff).toFixed(1)} p.p.
                </span>
            </div>
        `;
    };

    return `
        <div class="sim-result-stats">
            <div class="stat-card">
                <div class="stat-value">R$ ${fmt(result.revenue)}</div>
                <div class="stat-label">Receita</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:var(--error,#f44336)">R$ ${fmt(result.cost)}</div>
                <div class="stat-label">Custo</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:${result.profit >= 0 ? 'var(--fast-green,#7cfc00)' : 'var(--error,#f44336)'}">R$ ${fmt(result.profit)}</div>
                <div class="stat-label">Lucro</div>
            </div>
        </div>

        <div class="sim-margin-display sim-margin-${marginClass}">
            <div class="sim-margin-value">${result.margin.toFixed(1)}%</div>
            <div class="sim-margin-label">margem simulada</div>
        </div>

        <div class="sim-compare-box">
            ${compareLine(`vs. squad ${result.squad.icon || ''} ${result.squad.name} (${result.squad.currentMargin.toFixed(1)}% hoje)`, result.vsSquad)}
            ${compareLine(`vs. Fast inteira (${result.agency.currentMargin.toFixed(1)}% hoje)`, result.vsAgency)}
        </div>

        <div class="sim-breakdown">
            <div class="sim-breakdown-title">Detalhamento do custo</div>
            ${result.costBreakdown.length === 0
                ? '<p style="color:var(--text-secondary); font-size:0.85rem;">Nenhum custo de pessoa — só receita.</p>'
                : result.costBreakdown.map(c => `
                    <div class="sim-breakdown-row">
                        <span>${c.name} <span style="color:var(--text-secondary); font-size:0.78rem;">${c.role}</span></span>
                        <span>R$ ${fmt(c.cost)}</span>
                    </div>
                `).join('')
            }
        </div>
    `;
}

// ─── Handlers ───────────────────────────────────────────────────────────────

function attachSimulatorHandlers() {
    window.simChangeSquad = (squadId) => {
        draft.squadId = squadId || null;
        draft.clientMode = 'new';
        draft.existingContractId = '';
        draft.selectedPeople = [];
        draft.value = ''; draft.videoCount = ''; draft.staticCount = '';
        draft.trafficManagement = false; draft.founderBrand = false;
        lastResult = null;
        renderSimulatorPage();
    };

    window.simSetClientMode = (mode) => {
        draft.clientMode = mode;
        if (mode === 'new') {
            draft.existingContractId = '';
            draft.value = ''; draft.videoCount = ''; draft.staticCount = '';
            draft.trafficManagement = false; draft.founderBrand = false;
            draft.selectedPeople = [];
        }
        renderSimulatorPage();
    };

    // Carrega os dados reais do contrato escolhido pro draft, incluindo
    // quem já está alocado nele (rateado E fixo) — a partir daqui o usuário
    // só ajusta o que quiser e simula.
    window.simLoadExistingContract = (contractId) => {
        draft.existingContractId = contractId;
        if (!contractId) { renderSimulatorPage(); return; }

        const contract = storage.getContractById(contractId);
        if (!contract) { renderSimulatorPage(); return; }

        draft.value             = contract.value || 0;
        draft.videoCount        = contract.videoCount || 0;
        draft.staticCount       = contract.staticCount || 0;
        draft.trafficManagement = !!contract.trafficManagement;
        draft.founderBrand      = !!contract.founderBrand;
        draft.selectedPeople    = (contract.peopleAllocations || [])
            .filter(a => a.mode === 'rateado' || a.mode === 'founder_brand' || a.mode === 'fixo')
            .map(a => ({
                personId: a.personId,
                mode: a.mode === 'fixo' ? 'fixo' : 'rateado', // founder_brand é decidido automaticamente na hora de simular
                fixedValue: a.mode === 'fixo' ? (a.fixedValue || 0) : 0,
            }));

        renderSimulatorPage();
    };

    window.simUpdateField = (field, value) => {
        draft[field] = value;
    };

    window.simToggleField = (field, checked) => {
        draft[field] = checked;
    };

    window.simTogglePerson = (personId, checked) => {
        if (checked) {
            if (!draft.selectedPeople.some(p => p.personId === personId)) {
                draft.selectedPeople.push({ personId, mode: 'rateado', fixedValue: 0 });
            }
        } else {
            draft.selectedPeople = draft.selectedPeople.filter(p => p.personId !== personId);
        }
        renderSimulatorPage();
    };

    window.simSetPersonMode = (personId, mode) => {
        const entry = draft.selectedPeople.find(p => p.personId === personId);
        if (entry) entry.mode = mode;
        renderSimulatorPage();
    };

    window.simSetPersonFixedValue = (personId, value) => {
        const entry = draft.selectedPeople.find(p => p.personId === personId);
        if (entry) entry.fixedValue = parseFloat(value) || 0;
    };

    window.simRun = () => {
        try {
            const assignments = draft.selectedPeople.map(({ personId, mode, fixedValue }) => {
                if (mode === 'fixo') return { personId, mode: 'fixo', fixedValue };

                const person = personService.getPerson(personId);
                const useFounderBrand = draft.founderBrand && person.role === 'Copywriter' && (person.founderBrandPercent || 0) > 0;
                return { personId, mode: useFounderBrand ? 'founder_brand' : 'rateado' };
            });

            lastResult = analyticsService.simulateContractMargin({
                squadId: draft.squadId,
                clientMode: draft.clientMode,
                existingContractId: draft.existingContractId || null,
                value: parseFloat(draft.value) || 0,
                videoCount: parseInt(draft.videoCount) || 0,
                staticCount: parseInt(draft.staticCount) || 0,
                trafficManagement: draft.trafficManagement,
                founderBrand: draft.founderBrand,
                assignments,
            });

            document.getElementById('sim-result').innerHTML = renderResult(lastResult);
        } catch (e) {
            document.getElementById('sim-result').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>${e.message}</p></div>`;
        }
    };
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(v) {
    const n = Number(v);
    if (isNaN(n)) return '0,00';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function simulatorStyles() {
    return `
        .sim-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            align-items: start;
        }
        .sim-people-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            max-height: 260px;
            overflow-y: auto;
            padding: 0.5rem;
            background: var(--bg-darker, #15151a);
            border: 1px solid var(--border, #2a2a2a);
            border-radius: 6px;
        }
        .sim-people-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.88rem;
            cursor: pointer;
            padding: 0.3rem 0.4rem;
            border-radius: 4px;
        }
        .sim-people-item:hover { background: rgba(255,255,255,0.04); }
        .sim-people-role { color: var(--text-secondary, #999); font-size: 0.76rem; }
        .sim-people-fb { font-size: 0.7rem; background: rgba(186,104,200,0.18); color: #ba68c8; padding: 0.1rem 0.4rem; border-radius: 4px; }

        .sim-people-item-wrap { border-bottom: 1px solid var(--border, #2a2a2a); padding-bottom: 0.4rem; }
        .sim-people-item-wrap:last-child { border-bottom: none; }
        .sim-people-mode {
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 0.78rem;
            color: var(--text-secondary, #999);
            padding: 0.3rem 0 0.3rem 1.8rem;
        }
        .sim-people-mode label { display: flex; align-items: center; gap: 0.3rem; cursor: pointer; }
        .sim-fixed-input { width: 90px; padding: 0.2rem 0.4rem; font-size: 0.78rem; }

        .sim-result-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
            margin-bottom: 1.25rem;
        }
        .sim-margin-display {
            text-align: center;
            padding: 1.25rem;
            border-radius: 8px;
            margin-bottom: 1.25rem;
        }
        .sim-margin-good { background: rgba(124,252,0,0.1); border: 1px solid rgba(124,252,0,0.3); }
        .sim-margin-ok   { background: rgba(255,179,0,0.1); border: 1px solid rgba(255,179,0,0.3); }
        .sim-margin-bad  { background: rgba(244,67,54,0.1); border: 1px solid rgba(244,67,54,0.3); }
        .sim-margin-value { font-size: 2.2rem; font-weight: 800; }
        .sim-margin-label { font-size: 0.85rem; color: var(--text-secondary, #999); }

        .sim-compare-box {
            background: var(--bg-darker, #15151a);
            border: 1px solid var(--border, #2a2a2a);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1.25rem;
        }
        .sim-compare-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.4rem 0;
            font-size: 0.88rem;
        }
        .sim-above { color: var(--fast-green, #7cfc00); font-weight: 600; }
        .sim-below { color: var(--error, #f44336); font-weight: 600; }

        .sim-breakdown-title {
            font-size: 0.78rem;
            text-transform: uppercase;
            color: var(--text-secondary, #999);
            margin-bottom: 0.5rem;
            letter-spacing: 0.04em;
        }
        .sim-breakdown-row {
            display: flex;
            justify-content: space-between;
            padding: 0.4rem 0;
            border-bottom: 1px solid var(--border, #2a2a2a);
            font-size: 0.88rem;
        }

        @media (max-width: 900px) {
            .sim-layout { grid-template-columns: 1fr; }
        }
    `;
}
