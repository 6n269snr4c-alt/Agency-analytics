// clientsPage.js - Visão consolidada por cliente
// Agrega receita recorrente + pontual, margem total e histórico de projetos por cliente.

import { renderPeriodSelector } from '../components/periodSelector.js';
import clientService from '../services/clientService.js';
import storage from '../store/storage.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(v) {
    const n = Number(v);
    if (isNaN(n)) return '0,00';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(v) {
    const n = Number(v);
    return isNaN(n) ? '0,0%' : n.toFixed(1) + '%';
}

function marginColor(m) {
    if (m >= 30) return 'var(--fast-green, #7cfc00)';
    if (m >= 15) return 'var(--warning, #ffb300)';
    return 'var(--error, #f44336)';
}

function marginBadgeClass(m) {
    if (m >= 30) return 'badge-success';
    if (m >= 15) return 'badge-warning';
    return 'badge-error';
}

function typeTag(profile) {
    if (profile.isRecurring && profile.isPunctual) return `<span class="badge badge-info"   style="font-size:0.72rem;">recorrente + pontual</span>`;
    if (profile.isRecurring)                        return `<span class="badge badge-success" style="font-size:0.72rem;">recorrente</span>`;
    return                                                  `<span class="badge"              style="font-size:0.72rem;background:rgba(255,160,0,0.15);color:#ff9800;">pontual</span>`;
}

// ─── entry point ─────────────────────────────────────────────────────────────

export function renderClientsPage() {
    const contentEl    = document.getElementById('content');
    const periodId     = storage.getCurrentPeriod();
    const profiles     = clientService.getAllClientProfiles(periodId);

    // ── Totais gerais do período ──
    const totalRevenue  = profiles.reduce((s, p) => s + p.totalRevenue, 0);
    const totalCost     = profiles.reduce((s, p) => s + p.totalCost,    0);
    const totalProfit   = totalRevenue - totalCost;
    const totalMargin   = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const activeCount   = profiles.filter(p => p.isRecurring).length;
    const punctualCount = profiles.filter(p => p.isPunctual && !p.isRecurring).length;

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">👤 Visão por Cliente</h1>
            <p class="page-subtitle">Receita consolidada (recorrente + projetos pontuais), margem total e LTV por cliente</p>
        </div>

        ${renderPeriodSelector()}

        <!-- Resumo do período -->
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:1.25rem;margin-bottom:2rem;">
            <div class="stat-card">
                <div class="stat-value" style="color:var(--fast-green,#7cfc00)">R$ ${fmt(totalRevenue)}</div>
                <div class="stat-label">Receita Total (clientes)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:var(--error,#f44336)">R$ ${fmt(totalCost)}</div>
                <div class="stat-label">Custo Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:${marginColor(totalMargin)}">R$ ${fmt(totalProfit)}</div>
                <div class="stat-label">Lucro Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:${marginColor(totalMargin)}">${pct(totalMargin)}</div>
                <div class="stat-label">Margem Consolidada</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${profiles.length}</div>
                <div class="stat-label">Clientes · <span style="color:var(--fast-green)">${activeCount} recorrentes</span>${punctualCount > 0 ? ` · <span style="color:#ff9800">${punctualCount} só pontual</span>` : ''}</div>
            </div>
        </div>

        <!-- Filtro/busca -->
        <div class="action-bar" style="margin-bottom:1.5rem;">
            <div class="action-bar-left" style="flex:1;">
                <input type="text" class="form-input" id="client-search"
                       placeholder="🔍 Buscar cliente..."
                       oninput="window.filterClients()"
                       style="max-width:320px;">
            </div>
            <div class="action-bar-right" style="gap:0.5rem;">
                <button class="btn btn-small btn-secondary ${window._clientSort === 'revenue' || !window._clientSort ? 'active' : ''}"
                        onclick="window.sortClients('revenue')">💵 Receita</button>
                <button class="btn btn-small btn-secondary ${window._clientSort === 'margin' ? 'active' : ''}"
                        onclick="window.sortClients('margin')">📊 Margem</button>
                <button class="btn btn-small btn-secondary ${window._clientSort === 'name' ? 'active' : ''}"
                        onclick="window.sortClients('name')">🔤 Nome</button>
            </div>
        </div>

        <!-- Lista de clientes -->
        <div id="clients-list">
            ${profiles.length === 0
                ? `<div class="empty-state"><div class="empty-state-icon">👤</div><h3>Nenhum cliente encontrado</h3><p>Cadastre contratos ou projetos pontuais para ver a visão por cliente.</p></div>`
                : profiles.map(p => renderClientCard(p)).join('')
            }
        </div>

        <style>${clientStyles()}</style>
    `;

    attachHandlers(profiles);
}

// ─── Card de cliente ─────────────────────────────────────────────────────────

function renderClientCard(profile) {
    const hasRecurring = profile.contractDetails.length > 0;
    const hasPunctual  = profile.projectDetails.length > 0;
    const cardId       = 'client-' + profile.clientName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '');

    return `
        <div class="client-card list-item" data-client="${profile.clientName.toLowerCase()}" style="margin-bottom:1rem;">

            <!-- Cabeçalho clicável -->
            <div class="client-card-header" onclick="window.toggleClientCard('${cardId}')"
                 style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">

                <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
                    <span style="font-size:1.15rem;font-weight:700;">${profile.clientName}</span>
                    ${typeTag(profile)}
                    <span class="badge ${marginBadgeClass(profile.margin)}" style="font-size:0.75rem;">${pct(profile.margin)} margem</span>
                </div>

                <!-- Métricas resumidas -->
                <div style="display:flex;align-items:center;gap:2rem;flex-wrap:wrap;">
                    ${hasRecurring ? `
                    <div style="text-align:right;">
                        <div style="font-size:0.72rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Recorrente</div>
                        <div style="font-weight:700;color:var(--fast-green,#7cfc00);">R$ ${fmt(profile.recurringRevenue)}</div>
                    </div>` : ''}
                    ${hasPunctual ? `
                    <div style="text-align:right;">
                        <div style="font-size:0.72rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Pontual (mês)</div>
                        <div style="font-weight:700;color:#ff9800;">R$ ${fmt(profile.projectRevenue)}</div>
                    </div>` : ''}
                    <div style="text-align:right;">
                        <div style="font-size:0.72rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Total (mês)</div>
                        <div style="font-weight:700;font-size:1.1rem;color:${marginColor(profile.margin)};">R$ ${fmt(profile.totalRevenue)}</div>
                    </div>
                    <div style="color:var(--text-secondary);font-size:1.2rem;">▼</div>
                </div>
            </div>

            <!-- Detalhe expansível -->
            <div id="${cardId}" class="client-card-detail" style="display:none;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border);">

                <!-- Financeiro consolidado -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1rem;margin-bottom:1.5rem;">
                    <div class="client-metric">
                        <span class="client-metric-label">💵 Receita Total</span>
                        <span class="client-metric-value" style="color:var(--fast-green,#7cfc00)">R$ ${fmt(profile.totalRevenue)}</span>
                    </div>
                    <div class="client-metric">
                        <span class="client-metric-label">💸 Custo Total</span>
                        <span class="client-metric-value" style="color:var(--error,#f44336)">R$ ${fmt(profile.totalCost)}</span>
                        ${profile.projectExtCost > 0 ? `<span style="font-size:0.72rem;color:var(--text-secondary);">ext: R$ ${fmt(profile.projectExtCost)}</span>` : ''}
                    </div>
                    <div class="client-metric">
                        <span class="client-metric-label">📈 Lucro</span>
                        <span class="client-metric-value" style="color:${marginColor(profile.margin)}">R$ ${fmt(profile.profit)}</span>
                    </div>
                    <div class="client-metric">
                        <span class="client-metric-label">📊 Margem</span>
                        <span class="client-metric-value" style="color:${marginColor(profile.margin)}">${pct(profile.margin)}</span>
                    </div>
                    ${profile.ltv > 0 ? `
                    <div class="client-metric">
                        <span class="client-metric-label">🏆 LTV</span>
                        <span class="client-metric-value" style="color:var(--text-primary)">R$ ${fmt(profile.ltv)}</span>
                        <span style="font-size:0.72rem;color:var(--text-secondary);">recorrente + concluídos</span>
                    </div>` : ''}
                </div>

                <!-- Divisão recorrente + pontual lado a lado -->
                <div style="display:grid;grid-template-columns:${hasRecurring && hasPunctual ? '1fr 1fr' : '1fr'};gap:1.5rem;">

                    ${hasRecurring ? `
                    <div>
                        <div style="font-size:0.8rem;font-weight:700;color:var(--fast-green,#7cfc00);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.75rem;">
                            📋 Contratos Recorrentes
                        </div>
                        ${profile.contractDetails.map(c => `
                            <div style="background:var(--bg-darker);border:1px solid var(--border);border-radius:8px;padding:0.875rem;margin-bottom:0.5rem;">
                                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
                                    <div>
                                        <span style="font-weight:600;">${c.name}</span>
                                        ${c.squad ? `<span style="font-size:0.78rem;color:var(--text-secondary);margin-left:0.5rem;">${c.squad.icon || '🏢'} ${c.squad.name}</span>` : ''}
                                    </div>
                                    <span class="badge ${marginBadgeClass(c.margin)}" style="font-size:0.72rem;">${pct(c.margin)}</span>
                                </div>
                                <div style="display:flex;gap:1.5rem;margin-top:0.5rem;font-size:0.85rem;">
                                    <span>Receita: <strong style="color:var(--fast-green,#7cfc00)">R$ ${fmt(c.revenue)}</strong></span>
                                    <span>Custo: <strong style="color:var(--error,#f44336)">R$ ${fmt(c.cost)}</strong></span>
                                    <span>Lucro: <strong style="color:${marginColor(c.margin)}">R$ ${fmt(c.profit)}</strong></span>
                                </div>
                            </div>
                        `).join('')}
                        <div style="text-align:right;font-size:0.85rem;color:var(--text-secondary);margin-top:0.25rem;">
                            Subtotal: R$ ${fmt(profile.recurringRevenue)} · margem ${pct(profile.recurringMargin)}
                        </div>
                    </div>
                    ` : ''}

                    ${hasPunctual ? `
                    <div>
                        <div style="font-size:0.8rem;font-weight:700;color:#ff9800;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.75rem;">
                            🚀 Projetos Pontuais (este mês)
                        </div>
                        ${profile.projectDetails.map(p => `
                            <div style="background:var(--bg-darker);border:1px solid rgba(255,160,0,0.2);border-radius:8px;padding:0.875rem;margin-bottom:0.5rem;">
                                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
                                    <div>
                                        <span style="font-weight:600;">${p.name}</span>
                                        ${p.squad ? `<span style="font-size:0.78rem;color:var(--text-secondary);margin-left:0.5rem;">${p.squad.icon || '🏢'} ${p.squad.name}</span>` : ''}
                                    </div>
                                    <span style="font-size:0.75rem;background:rgba(255,160,0,0.15);color:#ff9800;padding:0.2rem 0.5rem;border-radius:4px;">${statusLabel(p.status)}</span>
                                </div>
                                <div style="display:flex;gap:1.5rem;margin-top:0.5rem;font-size:0.85rem;flex-wrap:wrap;">
                                    <span>Valor: <strong style="color:#ff9800">R$ ${fmt(p.revenue)}</strong></span>
                                    ${p.externalCost > 0 ? `<span>Custo ext: <strong style="color:var(--error,#f44336)">R$ ${fmt(p.externalCost)}</strong></span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                        <div style="text-align:right;font-size:0.85rem;color:var(--text-secondary);margin-top:0.25rem;">
                            Subtotal: R$ ${fmt(profile.projectRevenue)}
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Histórico de projetos (todos, não só do período) -->
                ${profile.allProjects.length > profile.projectDetails.length ? `
                <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border);">
                    <div style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);margin-bottom:0.5rem;">📁 Outros projetos pontuais (fora deste período)</div>
                    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                        ${profile.allProjects
                            .filter(p => !profile.projectDetails.find(pd => pd.id === p.id))
                            .map(p => `<span style="background:var(--bg-darker);border:1px solid var(--border);padding:0.25rem 0.6rem;border-radius:6px;font-size:0.8rem;">
                                ${p.name} · R$ ${fmt(p.value)} · <em style="color:var(--text-secondary)">${periodLabel(p.billingPeriod)}</em>
                            </span>`)
                            .join('')}
                    </div>
                </div>
                ` : ''}

            </div>
        </div>
    `;
}

function statusLabel(s) {
    return s === 'concluido' ? '✅ Concluído' : s === 'cancelado' ? '❌ Cancelado' : '🔄 Em andamento';
}

function periodLabel(pid) {
    if (!pid) return '—';
    const [y, m] = pid.split('-');
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${months[parseInt(m, 10) - 1]}/${y}`;
}

// ─── Handlers interativos ────────────────────────────────────────────────────

function attachHandlers(profiles) {
    // Expandir/colapsar card
    window.toggleClientCard = function(id) {
        const el = document.getElementById(id);
        if (!el) return;
        const open = el.style.display !== 'none';
        el.style.display = open ? 'none' : 'block';
        // Girar ▼
        const header = el.previousElementSibling;
        const arrow  = header?.querySelector('[style*="1.2rem"]');
        if (arrow) arrow.textContent = open ? '▼' : '▲';
    };

    // Busca
    window.filterClients = function() {
        const q = document.getElementById('client-search').value.toLowerCase();
        document.querySelectorAll('.client-card').forEach(card => {
            const name = card.dataset.client || '';
            card.style.display = name.includes(q) ? '' : 'none';
        });
    };

    // Ordenação
    window._clientSort = window._clientSort || 'revenue';
    window.sortClients = function(by) {
        window._clientSort = by;
        let sorted = [...profiles];
        if (by === 'revenue') sorted.sort((a, b) => b.totalRevenue - a.totalRevenue);
        if (by === 'margin')  sorted.sort((a, b) => b.margin - a.margin);
        if (by === 'name')    sorted.sort((a, b) => a.clientName.localeCompare(b.clientName, 'pt-BR'));

        document.getElementById('clients-list').innerHTML =
            sorted.length === 0
                ? '<div class="empty-state"><p>Nenhum cliente</p></div>'
                : sorted.map(p => renderClientCard(p)).join('');

        // Rebind
        attachHandlers(sorted);
    };
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

function clientStyles() {
    return `
        .client-card { transition: border-color 0.2s; }
        .client-card:hover { border-color: rgba(124,252,0,0.25); }
        .client-card-header:hover { opacity: 0.9; }

        .client-metric {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
        }
        .client-metric-label {
            font-size: 0.72rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .client-metric-value {
            font-size: 1.05rem;
            font-weight: 700;
        }

        /* badge extras */
        .badge-info {
            background: rgba(33,150,243,0.15);
            color: #64b5f6;
        }
        .badge-warning {
            background: rgba(255,179,0,0.15);
            color: #ffb300;
        }
    `;
}
