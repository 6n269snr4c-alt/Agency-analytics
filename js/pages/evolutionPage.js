// evolutionPage.js - EVOLUÇÃO MENSAL COM GRÁFICO + TABELA COMPARATIVA

import { renderPeriodSelector } from '../components/periodSelector.js';
import analyticsService from '../services/analyticsService.js';
import storage from '../store/storage.js';

export function renderEvolutionPage() {
    const contentEl = document.getElementById('content');

    const evolution     = analyticsService.getMonthlyEvolution(6);
    const comparison    = analyticsService.compareWithPreviousMonth();
    const currentPeriod = storage.getCurrentPeriod();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Evolução Mensal</h1>
            <p class="page-subtitle">Análise comparativa de receita, custo e lucro por período</p>
        </div>

        ${renderPeriodSelector()}

        <!-- CARDS DE VARIAÇÃO MÊS A MÊS -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem;">
            ${renderDeltaCard('💵 Receita', comparison.current.revenue, comparison.changes.revenue, comparison.changes.revenuePercent)}
            ${renderDeltaCard('💰 Custo',   comparison.current.cost,    comparison.changes.cost,    comparison.changes.costPercent, true)}
            ${renderDeltaCard('📈 Lucro',   comparison.current.profit,  comparison.changes.profit,  null)}
            ${renderMarginCard(comparison.current.margin, comparison.changes.margin)}
        </div>

        <!-- GRÁFICO DE BARRAS -->
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; font-size: 1.1rem; color: var(--primary);">📊 Evolução dos Últimos 6 Meses</h2>
                <div style="display: flex; gap: 1.5rem; font-size: 0.8rem;">
                    <span style="display: flex; align-items: center; gap: 0.4rem;">
                        <span style="width: 12px; height: 12px; border-radius: 2px; background: #3bba6e; display: inline-block;"></span> Receita
                    </span>
                    <span style="display: flex; align-items: center; gap: 0.4rem;">
                        <span style="width: 12px; height: 12px; border-radius: 2px; background: #e05252; display: inline-block;"></span> Custo
                    </span>
                    <span style="display: flex; align-items: center; gap: 0.4rem;">
                        <span style="width: 12px; height: 12px; border-radius: 2px; background: #4ea8de; display: inline-block;"></span> Lucro
                    </span>
                </div>
            </div>
            <div style="width: 100%; overflow-x: auto;">
                ${renderBarChart(evolution)}
            </div>
        </div>

        <!-- GRÁFICO DE MARGEM -->
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
            <h2 style="margin: 0 0 1.5rem 0; font-size: 1.1rem; color: var(--primary);">📉 Tendência de Margem</h2>
            <div style="width: 100%; overflow-x: auto;">
                ${renderMarginChart(evolution)}
            </div>
        </div>

        <!-- TABELA COMPARATIVA -->
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 2rem;">
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--border);">
                <h2 style="margin: 0; font-size: 1.1rem; color: var(--primary);">📋 Comparativo Mensal Detalhado</h2>
            </div>
            <div class="table-container" style="margin: 0;">
                <table>
                    <thead>
                        <tr>
                            <th>Período</th>
                            <th>Receita</th>
                            <th>Δ Receita</th>
                            <th>Custo</th>
                            <th>Δ Custo</th>
                            <th>Lucro</th>
                            <th>Margem</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderEvolutionTable(evolution, currentPeriod)}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- INSIGHTS -->
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem;">
            <h2 style="margin: 0 0 1.5rem 0; font-size: 1.1rem; color: var(--primary);">💡 Insights do Período</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                ${renderInsights(evolution, comparison)}
            </div>
        </div>
    `;

    attachEvolutionHandlers();
}

// ─── CARDS DE DELTA ───────────────────────────────────────────────────────────

function renderDeltaCard(label, current, delta, deltaPercent, invertColors = false) {
    const isPositive = delta >= 0;
    const isGood     = invertColors ? !isPositive : isPositive;
    const color      = delta === 0 ? 'var(--text-secondary)' : (isGood ? 'var(--success)' : 'var(--error)');
    const arrow      = delta === 0 ? '→' : (isPositive ? '▲' : '▼');

    return `
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">${label}</div>
            <div style="font-size: 1.6rem; font-weight: 700; margin-bottom: 0.5rem;">R$ ${formatCurrency(current)}</div>
            <div style="font-size: 0.85rem; color: ${color}; display: flex; align-items: center; gap: 0.4rem;">
                <span>${arrow}</span>
                <span>R$ ${formatCurrency(Math.abs(delta))}</span>
                ${deltaPercent !== null ? `<span style="color: var(--text-secondary);">(${Math.abs(deltaPercent).toFixed(1)}%)</span>` : ''}
                <span style="color: var(--text-secondary); font-size: 0.75rem;">vs mês ant.</span>
            </div>
        </div>
    `;
}

function renderMarginCard(currentMargin, deltaMargin) {
    const color      = currentMargin >= 30 ? 'var(--success)' : currentMargin >= 15 ? 'var(--warning)' : 'var(--error)';
    const deltaColor = deltaMargin >= 0 ? 'var(--success)' : 'var(--error)';
    const arrow      = deltaMargin === 0 ? '→' : (deltaMargin > 0 ? '▲' : '▼');

    return `
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem;">
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">📊 Margem</div>
            <div style="font-size: 1.6rem; font-weight: 700; margin-bottom: 0.5rem; color: ${color};">${currentMargin.toFixed(1)}%</div>
            <div style="font-size: 0.85rem; color: ${deltaColor}; display: flex; align-items: center; gap: 0.4rem;">
                <span>${arrow}</span>
                <span>${Math.abs(deltaMargin).toFixed(1)}pp</span>
                <span style="color: var(--text-secondary); font-size: 0.75rem;">vs mês ant.</span>
            </div>
        </div>
    `;
}

// ─── GRÁFICO DE BARRAS SVG ────────────────────────────────────────────────────

function renderBarChart(evolution) {
    if (!evolution || evolution.length === 0) {
        return '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Sem dados para exibir</p>';
    }

    const W       = 800;
    const H       = 280;
    const padL    = 70;
    const padR    = 20;
    const padT    = 20;
    const padB    = 50;
    const chartW  = W - padL - padR;
    const chartH  = H - padT - padB;

    const allValues = evolution.flatMap(e => [e.revenue, e.cost, Math.max(0, e.profit)]);
    const maxVal    = Math.max(...allValues, 1);

    const groupW = chartW / evolution.length;
    const barW   = (groupW * 0.7) / 3;
    const barGap = barW * 0.15;

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const y     = padT + chartH - chartH * ratio;
        const value = maxVal * ratio;
        return `
            <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"
                  stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
            <text x="${padL - 8}" y="${y + 4}" text-anchor="end"
                  fill="rgba(255,255,255,0.35)" font-size="11">${formatK(value)}</text>
        `;
    }).join('');

    const bars = evolution.map((entry, i) => {
        const x0       = padL + i * groupW + groupW * 0.15;
        const revenueH = (entry.revenue               / maxVal) * chartH;
        const costH    = (entry.cost                  / maxVal) * chartH;
        const profitH  = (Math.max(0, entry.profit)   / maxVal) * chartH;

        return `
            <rect x="${x0}" y="${padT + chartH - revenueH}"
                  width="${barW}" height="${revenueH}"
                  fill="#3bba6e" rx="2" opacity="0.85"/>
            <rect x="${x0 + barW + barGap}" y="${padT + chartH - costH}"
                  width="${barW}" height="${costH}"
                  fill="#e05252" rx="2" opacity="0.85"/>
            <rect x="${x0 + (barW + barGap) * 2}" y="${padT + chartH - profitH}"
                  width="${barW}" height="${profitH}"
                  fill="#4ea8de" rx="2" opacity="0.85"/>
            <text x="${padL + i * groupW + groupW / 2}" y="${padT + chartH + 20}"
                  text-anchor="middle" fill="rgba(255,255,255,0.55)" font-size="11">${entry.label}</text>
        `;
    }).join('');

    return `
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
             style="width: 100%; height: auto; display: block;">
            ${gridLines}
            ${bars}
            <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}"
                  stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
        </svg>
    `;
}

// ─── GRÁFICO DE MARGEM (LINHA) ────────────────────────────────────────────────

function renderMarginChart(evolution) {
    if (!evolution || evolution.length === 0) return '';

    const W      = 800;
    const H      = 160;
    const padL   = 50;
    const padR   = 20;
    const padT   = 20;
    const padB   = 40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const margins = evolution.map(e => e.margin);
    const minM    = Math.min(...margins, 0);
    const maxM    = Math.max(...margins, 40);
    const range   = maxM - minM || 1;

    const toX = i => padL + (i / Math.max(evolution.length - 1, 1)) * chartW;
    const toY = m => padT + chartH - ((m - minM) / range) * chartH;

    const goodY = toY(30);
    const okY   = toY(15);
    const points = evolution.map((e, i) => `${toX(i)},${toY(e.margin)}`).join(' ');

    const dots = evolution.map((e, i) => {
        const x     = toX(i);
        const y     = toY(e.margin);
        const color = e.margin >= 30 ? '#3bba6e' : e.margin >= 15 ? '#f0b429' : '#e05252';
        return `
            <circle cx="${x}" cy="${y}" r="5" fill="${color}"/>
            <text x="${x}" y="${y - 10}" text-anchor="middle"
                  fill="rgba(255,255,255,0.6)" font-size="10">${e.margin.toFixed(1)}%</text>
            <text x="${x}" y="${padT + chartH + 20}" text-anchor="middle"
                  fill="rgba(255,255,255,0.4)" font-size="10">${e.label}</text>
        `;
    }).join('');

    return `
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
             style="width: 100%; height: auto; display: block;">
            ${goodY > padT ? `
                <rect x="${padL}" y="${padT}" width="${chartW}" height="${Math.max(0, goodY - padT)}"
                      fill="rgba(59,186,110,0.06)"/>
                <line x1="${padL}" y1="${goodY}" x2="${W - padR}" y2="${goodY}"
                      stroke="rgba(59,186,110,0.3)" stroke-width="1" stroke-dasharray="4,4"/>
                <text x="${padL - 4}" y="${goodY + 4}" text-anchor="end"
                      fill="rgba(59,186,110,0.5)" font-size="10">30%</text>
            ` : ''}
            ${okY > padT && okY < padT + chartH ? `
                <line x1="${padL}" y1="${okY}" x2="${W - padR}" y2="${okY}"
                      stroke="rgba(240,180,41,0.3)" stroke-width="1" stroke-dasharray="4,4"/>
                <text x="${padL - 4}" y="${okY + 4}" text-anchor="end"
                      fill="rgba(240,180,41,0.5)" font-size="10">15%</text>
            ` : ''}
            <polyline points="${points}" fill="none" stroke="rgba(78,168,222,0.8)"
                      stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
            ${dots}
            <line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}"
                  stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
        </svg>
    `;
}

// ─── TABELA COMPARATIVA ───────────────────────────────────────────────────────

function renderEvolutionTable(evolution, currentPeriod) {
    if (!evolution || evolution.length === 0) {
        return `<tr><td colspan="8" style="text-align:center; color: var(--text-secondary);">Sem dados</td></tr>`;
    }

    return evolution.map((entry, i) => {
        const prev         = evolution[i - 1];
        const deltaRevenue = prev ? entry.revenue - prev.revenue : null;
        const deltaCost    = prev ? entry.cost    - prev.cost    : null;
        const isCurrent    = entry.periodId === currentPeriod;

        const marginBadge = entry.margin >= 30 ? 'badge-success'
            : entry.margin >= 15 ? 'badge-warning' : 'badge-error';
        const profitBadge = entry.profit >= 0 ? 'badge-success' : 'badge-error';

        return `
            <tr style="${isCurrent ? 'background: rgba(59,186,110,0.07);' : ''}">
                <td>
                    <strong>${entry.label}</strong>
                    ${isCurrent ? '<span class="badge badge-success" style="margin-left: 0.4rem; font-size: 0.7rem;">Atual</span>' : ''}
                </td>
                <td>R$ ${formatCurrency(entry.revenue)}</td>
                <td>${renderDeltaCell(deltaRevenue, false)}</td>
                <td>R$ ${formatCurrency(entry.cost)}</td>
                <td>${renderDeltaCell(deltaCost, true)}</td>
                <td><span class="badge ${profitBadge}">R$ ${formatCurrency(entry.profit)}</span></td>
                <td><span class="badge ${marginBadge}">${entry.margin.toFixed(1)}%</span></td>
                <td>
                    ${entry.margin >= 30
                        ? '<span style="color: var(--success);">🟢 Saudável</span>'
                        : entry.margin >= 15
                            ? '<span style="color: var(--warning);">🟡 Atenção</span>'
                            : '<span style="color: var(--error);">🔴 Crítico</span>'
                    }
                </td>
            </tr>
        `;
    }).join('');
}

function renderDeltaCell(delta, invertColors) {
    if (delta === null) return '<span style="color: var(--text-secondary);">—</span>';

    const isPositive = delta >= 0;
    const isGood     = invertColors ? !isPositive : isPositive;
    const color      = delta === 0
        ? 'var(--text-secondary)'
        : (isGood ? 'var(--success)' : 'var(--error)');
    const arrow = delta === 0 ? '→' : (isPositive ? '▲' : '▼');

    return `<span style="color: ${color}; font-size: 0.85rem;">${arrow} R$ ${formatCurrency(Math.abs(delta))}</span>`;
}

// ─── INSIGHTS AUTOMÁTICOS ────────────────────────────────────────────────────

function renderInsights(evolution, comparison) {
    if (!evolution || evolution.length < 2) {
        return '<p style="color: var(--text-secondary);">Dados insuficientes para gerar insights.</p>';
    }

    const insights = [];
    const nonZero  = evolution.filter(e => e.revenue > 0);

    // Crescimento de receita
    if (comparison.changes.revenuePercent > 5) {
        insights.push({
            icon: '🚀', color: 'var(--success)',
            title: 'Receita em crescimento',
            text: `Receita cresceu ${comparison.changes.revenuePercent.toFixed(1)}% em relação ao mês anterior.`
        });
    } else if (comparison.changes.revenuePercent < -5) {
        insights.push({
            icon: '⚠️', color: 'var(--error)',
            title: 'Queda de receita',
            text: `Receita caiu ${Math.abs(comparison.changes.revenuePercent).toFixed(1)}% em relação ao mês anterior.`
        });
    }

    // Tendência de margem
    if (comparison.changes.margin > 3) {
        insights.push({
            icon: '📈', color: 'var(--success)',
            title: 'Margem melhorando',
            text: `Margem subiu ${comparison.changes.margin.toFixed(1)}pp. Controle de custos eficiente.`
        });
    } else if (comparison.changes.margin < -3) {
        insights.push({
            icon: '📉', color: 'var(--warning)',
            title: 'Margem em queda',
            text: `Margem caiu ${Math.abs(comparison.changes.margin).toFixed(1)}pp. Verificar estrutura de custos.`
        });
    }

    // Status da margem atual
    if (comparison.current.margin < 15) {
        insights.push({
            icon: '🔴', color: 'var(--error)',
            title: 'Margem crítica',
            text: `Margem de ${comparison.current.margin.toFixed(1)}% está abaixo dos 15% mínimos recomendados.`
        });
    } else if (comparison.current.margin >= 30) {
        insights.push({
            icon: '✅', color: 'var(--success)',
            title: 'Margem saudável',
            text: `Margem de ${comparison.current.margin.toFixed(1)}% está acima de 30%. Operação eficiente.`
        });
    }

    // Melhor e pior mês
    if (nonZero.length >= 3) {
        const best  = [...nonZero].sort((a, b) => b.margin - a.margin)[0];
        const worst = [...nonZero].sort((a, b) => a.margin - b.margin)[0];
        if (best.periodId !== worst.periodId) {
            insights.push({
                icon: '📊', color: '#4ea8de',
                title: 'Variação do período',
                text: `Melhor mês: ${best.label} (${best.margin.toFixed(1)}%) · Pior: ${worst.label} (${worst.margin.toFixed(1)}%)`
            });
        }
    }

    // Custo crescendo mais que receita
    if (
        comparison.changes.costPercent > 0 &&
        comparison.changes.revenuePercent >= 0 &&
        comparison.changes.costPercent > comparison.changes.revenuePercent
    ) {
        insights.push({
            icon: '⚡', color: 'var(--warning)',
            title: 'Custo crescendo mais que receita',
            text: `Custos (+${comparison.changes.costPercent.toFixed(1)}%) crescem mais rápido que receita (+${comparison.changes.revenuePercent.toFixed(1)}%).`
        });
    }

    if (insights.length === 0) {
        insights.push({
            icon: '📋', color: 'var(--text-secondary)',
            title: 'Operação estável',
            text: 'Sem variações significativas em relação ao mês anterior.'
        });
    }

    return insights.map(insight => `
        <div style="background: var(--bg); border: 1px solid var(--border);
                    border-left: 3px solid ${insight.color}; border-radius: 6px; padding: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                <span style="font-size: 1.1rem;">${insight.icon}</span>
                <strong style="color: ${insight.color}; font-size: 0.9rem;">${insight.title}</strong>
            </div>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.5;">${insight.text}</p>
        </div>
    `).join('');
}

// ─── HANDLERS ────────────────────────────────────────────────────────────────

function attachEvolutionHandlers() {
    window.renderEvolutionPage = renderEvolutionPage;
}

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

function formatCurrency(value) {
    return (value || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatK(value) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}k`;
    return value.toFixed(0);
}
