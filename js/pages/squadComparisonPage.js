// squadComparisonPage.js — DRE por Squad com linhas colapsáveis
// Receita e Custos mostram totais por padrão; clique expande os detalhes.
// Rateio de membros compartilhados é por entregáveis ponderados.

import { renderPeriodSelector } from '../components/periodSelector.js';
import squadService from '../services/squadService.js';
import analyticsService from '../services/analyticsService.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(value) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(value) {
    return value.toFixed(1) + '%';
}

function marginClass(margin) {
    if (margin >= 30) return 'dre-margin-good';
    if (margin >= 15) return 'dre-margin-warn';
    return 'dre-margin-bad';
}

function marginLabel(margin) {
    if (margin >= 30) return '✅ Saudável';
    if (margin >= 15) return '⚠️ Atenção';
    return '🔴 Crítico';
}

// ─── entry point ─────────────────────────────────────────────────────────────

export function renderSquadComparisonPage() {
    const contentEl = document.getElementById('content');
    const squads = squadService.getAllSquads();

    if (squads.length === 0) {
        contentEl.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">DRE por Squad</h1>
                <p class="page-subtitle">Demonstrativo de Resultado por Squad</p>
            </div>
            ${renderPeriodSelector()}
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <h3>Nenhum squad cadastrado</h3>
                <p>Crie squads para ver o DRE comparativo</p>
            </div>
            <style>${dreStyles()}</style>
        `;
        return;
    }

    const allDRE = analyticsService.getAllSquadsDRE();

    const consolidated = {
        revenue: allDRE.reduce((s, d) => s + d.revenue.total, 0),
        cost:    allDRE.reduce((s, d) => s + d.costs.total, 0),
        profit:  allDRE.reduce((s, d) => s + d.grossProfit, 0),
    };
    consolidated.margin = consolidated.revenue > 0
        ? (consolidated.profit / consolidated.revenue) * 100
        : 0;

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">DRE por Squad</h1>
            <p class="page-subtitle">Demonstrativo de Resultado por Squad — custos rateados por entregáveis</p>
        </div>

        ${renderPeriodSelector()}
        ${renderConsolidatedHeader(consolidated, allDRE.length)}

        <div class="dre-squads-grid">
            ${allDRE.map(dre => renderSquadDRE(dre)).join('')}
        </div>

        ${renderSharedPeopleNote(allDRE)}
        <style>${dreStyles()}</style>
    `;

    // Bind toggle events after render
    bindToggleEvents();
}

// ─── toggle handlers ─────────────────────────────────────────────────────────

function bindToggleEvents() {
    document.querySelectorAll('.dre-toggle-row').forEach(row => {
        row.addEventListener('click', () => {
            const targetId = row.dataset.target;
            const body = document.getElementById(targetId);
            const arrow = row.querySelector('.dre-arrow');
            if (!body) return;
            const isOpen = body.classList.toggle('dre-body-open');
            if (arrow) arrow.textContent = isOpen ? '▲' : '▼';
        });
    });
}

// ─── consolidated header ─────────────────────────────────────────────────────

function renderConsolidatedHeader(c, squadCount) {
    return `
        <div class="dre-consolidated">
            <div class="dre-consolidated-title">
                ⚡ Consolidado — ${squadCount} Squad${squadCount > 1 ? 's' : ''}
            </div>
            <div class="dre-consolidated-metrics">
                <div class="dre-metric">
                    <span class="dre-metric-label">Receita Total</span>
                    <span class="dre-metric-value" style="color:var(--success,#4caf50)">R$ ${fmt(c.revenue)}</span>
                </div>
                <div class="dre-metric-sep">−</div>
                <div class="dre-metric">
                    <span class="dre-metric-label">Custo Total</span>
                    <span class="dre-metric-value" style="color:var(--error,#f44336)">R$ ${fmt(c.cost)}</span>
                </div>
                <div class="dre-metric-sep">=</div>
                <div class="dre-metric">
                    <span class="dre-metric-label">Lucro Bruto</span>
                    <span class="dre-metric-value" style="color:${c.profit >= 0 ? 'var(--success,#4caf50)' : 'var(--error,#f44336)'}">
                        R$ ${fmt(c.profit)}
                    </span>
                </div>
                <div class="dre-metric">
                    <span class="dre-metric-label">Margem</span>
                    <span class="dre-metric-value ${marginClass(c.margin)}" style="padding:0.25rem 0.6rem;border-radius:6px">
                        ${pct(c.margin)}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// ─── DRE de um squad ─────────────────────────────────────────────────────────

let _uid = 0;
function uid(prefix) { return `${prefix}-${++_uid}`; }

function renderSquadDRE(dre) {
    const revenueBodyId = uid('rev');
    const costBodyId    = uid('cost');

    const revenueCount  = dre.revenue.perContract.length;
    const membersCount  = dre.costs.members.length;
    const hasHead       = !!dre.costs.head;
    const costLinesCount = membersCount + (hasHead ? 1 : 0);

    return `
        <div class="dre-card">

            <!-- Cabeçalho do Squad -->
            <div class="dre-card-header">
                ${dre.squadIcon ? `<span class="dre-squad-icon">${dre.squadIcon}</span>` : ''}
                <div class="dre-squad-info">
                    <h3 class="dre-squad-name">${dre.squadName}</h3>
                    ${dre.squadDescription ? `<p class="dre-squad-desc">${dre.squadDescription}</p>` : ''}
                </div>
                <span class="dre-margin-badge ${marginClass(dre.margin)}">${pct(dre.margin)}</span>
            </div>

            <!-- ══ RECEITA (linha colapsável) ══ -->
            <div class="dre-section">
                <div class="dre-toggle-row dre-section-title dre-color-revenue"
                     data-target="${revenueBodyId}"
                     title="Clique para ${revenueCount > 0 ? 'ver/ocultar contratos' : 'expandir'}">
                    <span>
                        📈 Receita Bruta
                        <span class="dre-count-badge">${revenueCount} contrato${revenueCount !== 1 ? 's' : ''}</span>
                    </span>
                    <span style="display:flex;align-items:center;gap:0.75rem">
                        <span>R$ ${fmt(dre.revenue.total)}</span>
                        <span class="dre-arrow">▼</span>
                    </span>
                </div>
                <div id="${revenueBodyId}" class="dre-collapsible-body">
                    ${revenueCount > 0 ? `
                        <div class="dre-rows">
                            ${dre.revenue.perContract.map(c => `
                                <div class="dre-row">
                                    <span class="dre-row-label">
                                        <span class="dre-dot dre-dot-revenue"></span>
                                        ${c.client}
                                    </span>
                                    <span class="dre-row-value">R$ ${fmt(c.value)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : `<div class="dre-empty-row">Nenhum contrato ativo neste período</div>`}
                </div>
            </div>

            <!-- ══ CUSTOS (linha colapsável) ══ -->
            <div class="dre-section">
                <div class="dre-toggle-row dre-section-title dre-color-cost"
                     data-target="${costBodyId}"
                     title="Clique para ver/ocultar membros">
                    <span>
                        💸 Custos do Squad
                        <span class="dre-count-badge">${costLinesCount} pessoa${costLinesCount !== 1 ? 's' : ''}</span>
                    </span>
                    <span style="display:flex;align-items:center;gap:0.75rem">
                        <span>R$ ${fmt(dre.costs.total)}</span>
                        <span class="dre-arrow">▼</span>
                    </span>
                </div>
                <div id="${costBodyId}" class="dre-collapsible-body">

                    <!-- Head -->
                    ${dre.costs.head ? `
                        <div class="dre-subsection-label">
                            <span>Liderança</span>
                            <span>R$ ${fmt(dre.costs.totalHead)}</span>
                        </div>
                        <div class="dre-rows">
                            <div class="dre-row">
                                <span class="dre-row-label">
                                    <span class="dre-dot dre-dot-head"></span>
                                    ${dre.costs.head.name}
                                    <span class="dre-role-tag">${dre.costs.head.role}</span>
                                    <span class="dre-tag dre-tag-head">HEAD</span>
                                    <span class="dre-alloc-hint">100% alocado</span>
                                </span>
                                <span class="dre-row-value">R$ ${fmt(dre.costs.head.salary)}</span>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Membros -->
                    ${membersCount > 0 ? `
                        <div class="dre-subsection-label">
                            <span>Equipe</span>
                            <span>R$ ${fmt(dre.costs.totalMembers)}</span>
                        </div>
                        <div class="dre-rows">
                            ${dre.costs.members.map(m => renderMemberRow(m)).join('')}
                        </div>
                    ` : `<div class="dre-empty-row">Sem membros além do Head</div>`}
                </div>
            </div>

            <!-- ══ RESULTADO ══ -->
            <div class="dre-result">
                <div class="dre-result-row">
                    <span>Receita Bruta</span>
                    <span style="color:var(--success,#4caf50)">R$ ${fmt(dre.revenue.total)}</span>
                </div>
                <div class="dre-result-row">
                    <span>(−) Custos Totais</span>
                    <span style="color:var(--error,#f44336)">R$ ${fmt(dre.costs.total)}</span>
                </div>
                <div class="dre-result-divider"></div>
                <div class="dre-result-row dre-result-main">
                    <span>= Lucro Bruto</span>
                    <span style="color:${dre.grossProfit >= 0 ? 'var(--success,#4caf50)' : 'var(--error,#f44336)'}">
                        R$ ${fmt(dre.grossProfit)}
                    </span>
                </div>
                <div class="dre-result-row">
                    <span>Margem</span>
                    <span class="${marginClass(dre.margin)}" style="padding:0.2rem 0.5rem;border-radius:4px">
                        ${pct(dre.margin)} — ${marginLabel(dre.margin)}
                    </span>
                </div>
                <div class="dre-result-row dre-result-sub">
                    <span>${dre.contractCount} contrato${dre.contractCount !== 1 ? 's' : ''}</span>
                    <span>${dre.memberCount} pessoa${dre.memberCount !== 1 ? 's' : ''} (incl. head)</span>
                </div>
            </div>

        </div>
    `;
}

// ─── linha de membro com rateio ───────────────────────────────────────────────

function renderMemberRow(m) {
    // Tooltip explicando o rateio
    let allocTooltip = '';
    let allocLabel   = '';

    if (!m.isShared) {
        allocLabel = '100%';
        allocTooltip = 'Exclusivo deste squad';
    } else if (m.allocationMethod === 'deliverables') {
        allocLabel = `${pct(m.allocationPct)}`;
        allocTooltip = `Rateio por entregáveis: ${m.pointsHere.toFixed(0)} pts aqui / ${m.pointsTotal.toFixed(0)} pts totais`;
    } else {
        // fallback igual
        allocLabel = `${pct(m.allocationPct)}`;
        allocTooltip = `Divisão igual entre ${m.squadsCount} squads (sem entregáveis mapeados)`;
    }

    return `
        <div class="dre-row ${m.isShared ? 'dre-row-shared' : ''}">
            <span class="dre-row-label">
                <span class="dre-dot dre-dot-member"></span>
                ${m.name}
                <span class="dre-role-tag">${m.role}</span>
                ${m.isShared ? `
                    <span class="dre-tag dre-tag-shared" title="${allocTooltip}">
                        ${allocLabel} · ${m.squadsCount} squads
                    </span>
                ` : ''}
            </span>
            <div class="dre-row-value-group">
                ${m.isShared ? `<span class="dre-row-full-salary">R$ ${fmt(m.fullSalary)}</span>` : ''}
                <span class="dre-row-value">R$ ${fmt(m.allocatedCost)}</span>
            </div>
        </div>
    `;
}

// ─── nota de pessoas compartilhadas ──────────────────────────────────────────

function renderSharedPeopleNote(allDRE) {
    const sharedPeople = new Map();

    allDRE.forEach(dre => {
        dre.costs.members.forEach(m => {
            if (!m.isShared) return;
            if (!sharedPeople.has(m.personId)) {
                sharedPeople.set(m.personId, { ...m, squadsData: [] });
            }
            sharedPeople.get(m.personId).squadsData.push({
                name: dre.squadName,
                allocatedCost: m.allocatedCost,
                allocationPct: m.allocationPct,
                pointsHere: m.pointsHere,
                method: m.allocationMethod
            });
        });
    });

    if (sharedPeople.size === 0) return '';

    return `
        <div class="dre-shared-note">
            <div class="dre-shared-note-title">🔀 Pessoas alocadas em múltiplos squads — detalhamento do rateio</div>
            <div class="dre-rows">
                ${[...sharedPeople.values()].map(p => `
                    <div class="dre-row">
                        <span class="dre-row-label" style="flex-direction:column;align-items:flex-start;gap:0.25rem">
                            <span style="display:flex;align-items:center;gap:0.4rem">
                                ${p.name}
                                <span class="dre-role-tag">${p.role}</span>
                                <span style="color:var(--text-secondary,#888);font-size:0.75rem">
                                    Salário total: R$ ${fmt(p.fullSalary)}
                                </span>
                            </span>
                            <span style="display:flex;gap:0.75rem;flex-wrap:wrap">
                                ${p.squadsData.map(s => `
                                    <span class="dre-squad-alloc-chip"
                                          title="${s.method === 'deliverables' ? `${s.pointsHere.toFixed(0)} pts neste squad` : 'Divisão igual (sem entregáveis mapeados)'}">
                                        ${s.name}: <strong>${pct(s.allocationPct)}</strong> = R$ ${fmt(s.allocatedCost)}
                                        ${s.method === 'equal' ? ' ⚠️' : ''}
                                    </span>
                                `).join('')}
                            </span>
                        </span>
                    </div>
                `).join('')}
            </div>
            <div class="dre-shared-note-footer">
                ⚠️ indica rateio por divisão igual (pessoa não tem entregáveis atribuídos nos contratos daquele squad).
            </div>
        </div>
    `;
}

// ─── estilos ─────────────────────────────────────────────────────────────────

function dreStyles() {
    return `
        .dre-squads-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
            gap: 1.5rem;
            margin-top: 1.5rem;
        }

        /* ── Consolidated ── */
        .dre-consolidated {
            background: var(--bg-card, #1a1a1a);
            border: 1px solid var(--border, #2a2a2a);
            border-radius: 12px;
            padding: 1.25rem 1.5rem;
            margin-bottom: 0.5rem;
        }
        .dre-consolidated-title {
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--text-secondary, #888);
            margin-bottom: 1rem;
        }
        .dre-consolidated-metrics {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            flex-wrap: wrap;
        }
        .dre-metric { display: flex; flex-direction: column; gap: 0.25rem; }
        .dre-metric-label {
            font-size: 0.72rem;
            color: var(--text-secondary, #888);
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .dre-metric-value {
            font-size: 1.5rem;
            font-weight: 800;
            font-variant-numeric: tabular-nums;
        }
        .dre-metric-sep {
            font-size: 1.5rem;
            color: var(--text-secondary, #888);
            font-weight: 300;
        }

        /* ── Card ── */
        .dre-card {
            background: var(--bg-card, #1a1a1a);
            border: 1px solid var(--border, #2a2a2a);
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .dre-card-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1.25rem 1.5rem;
            border-bottom: 2px solid var(--border, #2a2a2a);
        }
        .dre-squad-icon { font-size: 2rem; line-height: 1; }
        .dre-squad-info { flex: 1; }
        .dre-squad-name {
            margin: 0;
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--primary, #00ff41);
        }
        .dre-squad-desc {
            margin: 0.2rem 0 0;
            font-size: 0.8rem;
            color: var(--text-secondary, #888);
        }
        .dre-margin-badge {
            font-size: 1.05rem;
            font-weight: 800;
            padding: 0.35rem 0.75rem;
            border-radius: 8px;
            font-variant-numeric: tabular-nums;
        }

        /* ── Sections ── */
        .dre-section {
            border-bottom: 1px solid var(--border, #2a2a2a);
        }
        .dre-section-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            padding: 0.85rem 1.5rem;
        }

        /* ── Toggle / collapsible ── */
        .dre-toggle-row {
            cursor: pointer;
            user-select: none;
            transition: background 0.15s;
        }
        .dre-toggle-row:hover {
            background: rgba(255,255,255,0.04);
        }
        .dre-arrow {
            font-size: 0.65rem;
            opacity: 0.6;
            transition: transform 0.2s;
        }
        .dre-collapsible-body {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.25s ease, padding 0.2s ease;
            padding: 0 1.5rem;
        }
        .dre-collapsible-body.dre-body-open {
            max-height: 600px;
            padding: 0 1.5rem 1rem;
        }
        .dre-count-badge {
            font-size: 0.65rem;
            font-weight: 600;
            background: rgba(255,255,255,0.1);
            color: var(--text-secondary, #888);
            padding: 0.1rem 0.45rem;
            border-radius: 10px;
            margin-left: 0.4rem;
            text-transform: none;
            letter-spacing: 0;
        }

        /* ── Subsections ── */
        .dre-subsection-label {
            display: flex;
            justify-content: space-between;
            font-size: 0.7rem;
            color: var(--text-secondary, #888);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin: 0.75rem 0 0.35rem;
            font-variant-numeric: tabular-nums;
        }

        /* ── Rows ── */
        .dre-rows { display: flex; flex-direction: column; gap: 0.35rem; }
        .dre-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
            padding: 0.3rem 0.4rem;
            border-radius: 6px;
            transition: background 0.15s;
        }
        .dre-row:hover { background: rgba(255,255,255,0.04); }
        .dre-row-shared { background: rgba(255,190,50,0.06); }
        .dre-row-shared:hover { background: rgba(255,190,50,0.1); }
        .dre-row-label {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            flex-wrap: wrap;
            color: var(--text-primary, #e0e0e0);
        }
        .dre-row-value {
            font-variant-numeric: tabular-nums;
            font-weight: 600;
            white-space: nowrap;
        }
        .dre-row-value-group {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0.1rem;
        }
        .dre-row-full-salary {
            font-size: 0.72rem;
            color: var(--text-secondary, #888);
            text-decoration: line-through;
            font-variant-numeric: tabular-nums;
        }
        .dre-empty-row {
            font-size: 0.8rem;
            color: var(--text-secondary, #888);
            padding: 0.6rem 0.4rem;
            font-style: italic;
        }
        .dre-alloc-hint {
            font-size: 0.68rem;
            color: var(--text-secondary, #888);
            font-style: italic;
        }

        /* ── Dots ── */
        .dre-dot {
            width: 7px; height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .dre-dot-revenue { background: var(--success, #4caf50); }
        .dre-dot-member  { background: var(--warning, #ff9800); }
        .dre-dot-head    { background: #4ea8de; }

        /* ── Tags ── */
        .dre-role-tag {
            background: rgba(255,255,255,0.08);
            color: var(--text-secondary, #888);
            font-size: 0.68rem;
            padding: 0.1rem 0.4rem;
            border-radius: 4px;
        }
        .dre-tag {
            font-size: 0.62rem;
            font-weight: 700;
            padding: 0.1rem 0.45rem;
            border-radius: 4px;
            letter-spacing: 0.03em;
            cursor: help;
        }
        .dre-tag-head   { background: rgba(78,168,222,0.2);   color: #4ea8de; }
        .dre-tag-shared { background: rgba(255,190,50,0.2);   color: #ffbe32; }

        /* ── Result block ── */
        .dre-result {
            padding: 1.25rem 1.5rem;
            background: var(--bg-darker, #111);
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-top: auto;
        }
        .dre-result-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.88rem;
            font-variant-numeric: tabular-nums;
        }
        .dre-result-divider { border-top: 1px solid var(--border, #2a2a2a); margin: 0.25rem 0; }
        .dre-result-main { font-size: 1.1rem; font-weight: 700; }
        .dre-result-sub  { font-size: 0.72rem; color: var(--text-secondary, #888); margin-top: 0.25rem; }

        /* ── Colors ── */
        .dre-color-revenue { color: var(--success, #4caf50); }
        .dre-color-cost    { color: var(--error, #f44336); }
        .dre-margin-good   { color: var(--success, #4caf50); background: rgba(76,175,80,0.15); }
        .dre-margin-warn   { color: var(--warning, #ff9800); background: rgba(255,152,0,0.15); }
        .dre-margin-bad    { color: var(--error, #f44336);   background: rgba(244,67,54,0.15); }

        /* ── Shared people note ── */
        .dre-shared-note {
            margin-top: 1.5rem;
            background: rgba(255,190,50,0.06);
            border: 1px solid rgba(255,190,50,0.25);
            border-radius: 12px;
            padding: 1.25rem 1.5rem;
        }
        .dre-shared-note-title {
            font-size: 0.78rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #ffbe32;
            margin-bottom: 0.75rem;
        }
        .dre-shared-note-footer {
            margin-top: 0.75rem;
            font-size: 0.75rem;
            color: var(--text-secondary, #888);
            font-style: italic;
        }
        .dre-squad-alloc-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.2rem;
            font-size: 0.78rem;
            background: rgba(255,255,255,0.06);
            border: 1px solid var(--border, #2a2a2a);
            padding: 0.15rem 0.5rem;
            border-radius: 6px;
            font-variant-numeric: tabular-nums;
            cursor: help;
        }

        @media (max-width: 768px) {
            .dre-squads-grid { grid-template-columns: 1fr; }
            .dre-consolidated-metrics { gap: 1rem; }
            .dre-metric-value { font-size: 1.2rem; }
        }
    `;
}
