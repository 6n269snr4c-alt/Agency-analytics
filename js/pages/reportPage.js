// reportPage.js — Relatório Mensal (snapshot do sistema)
// Gera um HTML completo numa nova aba, formatado pra impressão (Ctrl+P →
// Salvar como PDF). Serve de registro mensal do estado da operação.

import analyticsService from '../services/analyticsService.js';
import contractService from '../services/contractService.js';
import personService from '../services/personService.js';
import squadService from '../services/squadService.js';
import projectService from '../services/projectService.js';
import storage from '../store/storage.js';

export function renderReportPage() {
    const contentEl = document.getElementById('content');
    const currentPeriod = storage.getCurrentPeriod();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">📄 Relatório Mensal</h1>
            <p class="page-subtitle">Gera um snapshot completo do sistema para o mês de referência escolhido</p>
        </div>

        <div class="widget" style="max-width:500px;">
            <div class="widget-header"><h2 class="widget-title">Configuração</h2></div>
            <div class="widget-body">
                <div class="form-group">
                    <label class="form-label">Mês de referência</label>
                    <input type="month" class="form-input" id="report-month" value="${currentPeriod}">
                </div>
                <div class="form-group">
                    <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                        <input type="checkbox" id="report-include-projects" checked>
                        Incluir projetos pontuais
                    </label>
                </div>
                <button class="btn btn-primary" style="width:100%; margin-top:0.5rem;" onclick="window.generateReport()">
                    📄 Gerar Relatório
                </button>
                <p style="font-size:0.78rem; color:var(--text-secondary); margin-top:0.75rem;">
                    O relatório abre numa nova aba. Use <strong>Ctrl+P</strong> (ou ⌘P no Mac) → <strong>Salvar como PDF</strong> pra guardar o arquivo.
                </p>
            </div>
        </div>
    `;

    window.generateReport = () => {
        const periodId = document.getElementById('report-month').value;
        const includeProjects = document.getElementById('report-include-projects').checked;
        const html = buildReportHTML(periodId, includeProjects);
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
    };
}

// ─────────────────────────────────────────────────────────────────────────────

function buildReportHTML(periodId, includeProjects) {
    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const [year, month] = periodId.split('-').map(Number);
    const periodLabel = `${monthNames[month - 1]} ${year}`;

    const overall    = analyticsService.getOverallROI(periodId, includeProjects);
    const squads     = squadService.getAllSquads();
    const allDRE     = squads.map(sq => analyticsService.getSquadDRE(sq.id, periodId, includeProjects)).filter(Boolean);
    const contracts  = contractService.getAllContracts();
    const people     = personService.getAllPeople();
    const projects   = includeProjects ? projectService.getProjectsForPeriod(periodId) : [];
    const reconciliation = analyticsService.getSalaryReconciliation(periodId);
    const roles      = personService.getAllRoles();

    // Contratos/projetos sem squad
    const unassignedContracts = contracts.filter(c => !c.squadTag);
    const unassignedProjects  = projects.filter(p => !p.squadId);
    if (unassignedContracts.length > 0 || unassignedProjects.length > 0) {
        const uRevenue = unassignedContracts.reduce((s, c) => s + (c.value || 0), 0)
                       + unassignedProjects.reduce((s, p) => s + (p.value || 0), 0);
        const uCostItems = [];
        let uTotalCost = 0;
        unassignedContracts.forEach(c => {
            const roi = analyticsService.getContractROI(c.id, periodId, includeProjects);
            uTotalCost += roi.cost;
            roi.costBreakdown.forEach(item => {
                const existing = uCostItems.find(x => x.personId === item.personId);
                if (existing) existing.cost += item.totalCost;
                else uCostItems.push({ personId: item.personId, name: item.name, role: item.role, cost: item.totalCost, isHead: item.isHead });
            });
        });
        unassignedProjects.forEach(p => {
            const roi = analyticsService.getProjectROI(p.id, periodId);
            uTotalCost += roi.cost;
        });
        const uProfit = uRevenue - uTotalCost;
        const uMargin = uRevenue > 0 ? (uProfit / uRevenue) * 100 : 0;
        allDRE.push({
            squadIcon: '📦', squadName: 'Sem Squad',
            contractCount: unassignedContracts.length, projectCount: unassignedProjects.length,
            revenue: { total: uRevenue,
                perContract: unassignedContracts.map(c => ({ client: c.client, value: c.value || 0 })),
                perProject: unassignedProjects.map(p => ({ client: p.client || p.name, value: p.value || 0 })),
            },
            costs: { total: uTotalCost,
                members: uCostItems.filter(i => !i.isHead),
                totalMembers: uCostItems.filter(i => !i.isHead).reduce((s, i) => s + i.cost, 0),
                head: null, totalHead: 0,
                headMaster: uCostItems.find(i => i.isHead && i.name.includes('Master')) || null,
                totalHeadMaster: (uCostItems.find(i => i.isHead && i.name.includes('Master')) || {}).cost || 0,
                totalExternalProjects: 0, externalProjectsList: [],
            },
            grossProfit: uProfit, margin: uMargin,
        });
    }

    // Comparação por cargo
    const roleComparisons = [];
    roles.forEach(role => {
        const comparison = analyticsService.comparePeopleByRole(role).filter(p => p.costPerDeliverable > 0);
        if (comparison.length >= 2) {
            roleComparisons.push({ role, people: [...comparison].sort((a, b) => a.costPerDeliverable - b.costPerDeliverable) });
        }
    });

    // Margem visual (barra)
    function marginBar(margin, width) {
        const pct = Math.max(0, Math.min(100, margin));
        const color = margin >= 40 ? '#2e7d32' : margin >= 20 ? '#f9a825' : '#c62828';
        return `<div style="display:flex;align-items:center;gap:6px;">
            <div style="width:${width}px;height:8px;background:#e0e0e0;border-radius:4px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;"></div>
            </div>
            <span style="font-weight:700;font-size:10px;color:${color};">${margin.toFixed(1)}%</span>
        </div>`;
    }

    // Revenue share bar
    function shareBar(value, total, color) {
        const pct = total > 0 ? (value / total * 100) : 0;
        return `<div style="width:100%;height:6px;background:#e8e8e8;border-radius:3px;overflow:hidden;margin-top:3px;">
            <div style="width:${pct.toFixed(1)}%;height:100%;background:${color};border-radius:3px;"></div>
        </div>`;
    }

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Fast Analytics — ${periodLabel}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 9.5px; color: #1a1a1a; background: #fff; line-height: 1.45; }

    /* ── Header ── */
    .header { background: #0D0D0D; color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
    .header-left h1 { font-size: 20px; font-weight: 800; color: #C8FF00; letter-spacing: -0.5px; }
    .header-left .sub { font-size: 10px; color: #888; margin-top: 2px; }
    .header-right { text-align: right; }
    .header-right .period { font-size: 16px; font-weight: 700; color: #fff; }
    .header-right .meta { font-size: 9px; color: #666; margin-top: 2px; }

    .page { padding: 16px 24px; }

    /* ── KPI strip ── */
    .kpi-strip { display: flex; gap: 0; margin: 16px 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    .kpi-cell { flex: 1; padding: 14px 12px; text-align: center; border-right: 1px solid #eee; }
    .kpi-cell:last-child { border-right: none; }
    .kpi-cell.highlight { background: #f8fff0; }
    .kpi-val { font-size: 18px; font-weight: 800; }
    .kpi-lbl { font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-top: 3px; }
    .green { color: #2e7d32; } .red { color: #c62828; } .amber { color: #f57f17; }

    /* ── Section ── */
    .section-title { font-size: 12px; font-weight: 700; color: #0D0D0D; margin: 20px 0 10px; padding-bottom: 4px; border-bottom: 2px solid #0D0D0D; page-break-after: avoid; }

    /* ── Squad cards ── */
    .squad-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .squad-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; page-break-inside: avoid; }
    .squad-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .squad-name { font-size: 12px; font-weight: 700; }
    .squad-margin { font-size: 14px; font-weight: 800; }
    .squad-row { display: flex; justify-content: space-between; font-size: 9px; padding: 2px 0; }
    .squad-row.total { border-top: 1px solid #ddd; margin-top: 4px; padding-top: 4px; font-weight: 700; }
    .squad-members { margin-top: 6px; padding-top: 6px; border-top: 1px solid #f0f0f0; }
    .squad-member { display: flex; justify-content: space-between; font-size: 8.5px; padding: 1.5px 0; color: #555; }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9px; page-break-inside: auto; }
    thead { background: #fafafa; }
    th { font-weight: 600; text-align: left; padding: 5px 6px; border-bottom: 2px solid #ddd; font-size: 8px; text-transform: uppercase; color: #666; letter-spacing: 0.3px; }
    td { padding: 4px 6px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    tr { page-break-inside: avoid; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    .badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 8px; font-weight: 700; }
    .badge-green  { background: #e8f5e9; color: #2e7d32; }
    .badge-yellow { background: #fff8e1; color: #f57f17; }
    .badge-red    { background: #fce4ec; color: #c62828; }

    /* ── Role comparison ── */
    .role-section { margin-bottom: 14px; page-break-inside: avoid; }
    .role-title { font-size: 10px; font-weight: 700; color: #333; margin-bottom: 4px; }
    .role-bar-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 9px; }
    .role-bar-name { width: 120px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .role-bar-track { flex: 1; height: 10px; background: #f0f0f0; border-radius: 5px; overflow: hidden; position: relative; }
    .role-bar-fill { height: 100%; border-radius: 5px; }
    .role-bar-val { width: 90px; text-align: right; font-size: 8.5px; color: #555; }
    .role-bar-best { font-size: 7px; background: #e8f5e9; color: #2e7d32; padding: 1px 5px; border-radius: 8px; }

    .section-break { page-break-before: always; }
    .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 7.5px; color: #aaa; text-align: center; }

    @media print { .no-print { display: none !important; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="no-print" style="background:#0D0D0D;color:#fff;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:13px;">⚡ Relatório pronto — use <strong>Ctrl+P</strong> (⌘P) → Salvar como PDF</span>
    <button onclick="window.print()" style="background:#C8FF00;color:#0D0D0D;border:none;padding:8px 20px;border-radius:4px;font-weight:700;font-size:13px;cursor:pointer;">Salvar como PDF</button>
</div>

<!-- ══════ HEADER ══════ -->
<div class="header">
    <div class="header-left">
        <h1>⚡ FAST ANALYTICS</h1>
        <div class="sub">Fast Digital 360 — Relatório Operacional</div>
    </div>
    <div class="header-right">
        <div class="period">${periodLabel}</div>
        <div class="meta">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</div>
    </div>
</div>

<div class="page">

<!-- ══════ 1. RESUMO FINANCEIRO ══════ -->
<div class="kpi-strip">
    <div class="kpi-cell">
        <div class="kpi-val green">${fmtBRL(overall.revenue)}</div>
        <div class="kpi-lbl">Receita Total</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val red">${fmtBRL(overall.cost)}</div>
        <div class="kpi-lbl">Custo Total</div>
    </div>
    <div class="kpi-cell highlight">
        <div class="kpi-val ${overall.profit >= 0 ? 'green' : 'red'}">${fmtBRL(overall.profit)}</div>
        <div class="kpi-lbl">Lucro Bruto</div>
    </div>
    <div class="kpi-cell highlight">
        <div class="kpi-val" style="font-size:22px;">${overall.margin.toFixed(1)}%</div>
        <div class="kpi-lbl">Margem</div>
        ${marginBar(overall.margin, 80)}
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">${contracts.length}</div>
        <div class="kpi-lbl">Contratos</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-val">${people.length}</div>
        <div class="kpi-lbl">Pessoas</div>
    </div>
</div>

<!-- ══════ 2. DRE POR SQUAD ══════ -->
<div class="section-title">Performance por Squad</div>
<div class="squad-grid">
${allDRE.map(dre => {
    const mColor = dre.margin >= 40 ? '#2e7d32' : dre.margin >= 20 ? '#f57f17' : '#c62828';
    return `
    <div class="squad-card">
        <div class="squad-card-head">
            <span class="squad-name">${dre.squadIcon || ''} ${dre.squadName}</span>
            <span class="squad-margin" style="color:${mColor}">${dre.margin.toFixed(1)}%</span>
        </div>
        ${marginBar(dre.margin, 999).replace('width:999px', 'width:100%')}
        <div style="margin-top:8px;">
            <div class="squad-row"><span>Receita</span><span class="green">${fmtBRL(dre.revenue.total)}</span></div>
            <div class="squad-row"><span>Custos</span><span class="red">${fmtBRL(dre.costs.total)}</span></div>
            <div class="squad-row total"><span>Lucro</span><span style="color:${mColor}">${fmtBRL(dre.grossProfit)}</span></div>
        </div>
        <div class="squad-row" style="margin-top:4px;color:#888;font-size:8px;">
            <span>${dre.contractCount} contrato${dre.contractCount !== 1 ? 's' : ''}${dre.projectCount > 0 ? ` + ${dre.projectCount} projeto${dre.projectCount !== 1 ? 's' : ''}` : ''}</span>
            <span>${shareBar(dre.revenue.total, overall.revenue, mColor)} ${(dre.revenue.total / Math.max(overall.revenue, 1) * 100).toFixed(0)}% da receita</span>
        </div>
        <div class="squad-members">
            ${dre.costs.headMaster ? `<div class="squad-member"><span>👑 ${dre.costs.headMaster.name}</span><span>${fmtBRL(dre.costs.totalHeadMaster)}</span></div>` : ''}
            ${dre.costs.head ? `<div class="squad-member"><span>👤 ${dre.costs.head.name}</span><span>${fmtBRL(dre.costs.totalHead)}</span></div>` : ''}
            ${dre.costs.members.map(m => `<div class="squad-member"><span>${m.name}</span><span>${fmtBRL(m.cost)}</span></div>`).join('')}
        </div>
    </div>`;
}).join('')}
</div>

<!-- ══════ 3. COMPARAÇÃO POR CARGO ══════ -->
${roleComparisons.length > 0 ? `
<div class="section-title">Eficiência por Cargo</div>
${roleComparisons.map(({ role, people: ppl }) => {
    const maxCost = Math.max(...ppl.map(p => p.costPerDeliverable));
    const unitLabel = ppl[0]?.deliveryKind === 'head' ? '/cliente' : ppl[0]?.deliveryKind === 'traffic' ? '/contrato' : '/entrega';
    return `
    <div class="role-section">
        <div class="role-title">${role}</div>
        ${ppl.map((p, i) => {
            const pct = maxCost > 0 ? (p.costPerDeliverable / maxCost * 100) : 0;
            const color = i === 0 ? '#2e7d32' : '#64b5f6';
            return `
            <div class="role-bar-row">
                <span class="role-bar-name">${p.name} ${i === 0 ? '<span class="role-bar-best">melhor</span>' : ''}</span>
                <div class="role-bar-track">
                    <div class="role-bar-fill" style="width:${pct.toFixed(1)}%;background:${color};"></div>
                </div>
                <span class="role-bar-val">${fmtBRL(p.costPerDeliverable)}${unitLabel}</span>
            </div>`;
        }).join('')}
    </div>`;
}).join('')}
` : ''}

<!-- ══════ 4. CONTRATOS ══════ -->
<div class="section-title section-break">Contratos Ativos</div>
<table>
    <thead>
        <tr>
            <th>Cliente</th>
            <th>Squad</th>
            <th class="text-center">🎬</th>
            <th class="text-center">🖼️</th>
            <th class="text-center">📣</th>
            <th class="text-center">🎤</th>
            <th>Equipe</th>
            <th class="text-right">Receita</th>
            <th class="text-right">Custo</th>
            <th class="text-center">Margem</th>
        </tr>
    </thead>
    <tbody>
        ${contracts.map(c => {
            const roi = analyticsService.getContractROI(c.id, periodId, includeProjects);
            const squad = c.squadTag ? squadService.getSquad(c.squadTag) : null;
            const teamStr = roi.costBreakdown.map(b => b.name).join(', ') || '—';
            const mClass = roi.margin >= 40 ? 'badge-green' : roi.margin >= 15 ? 'badge-yellow' : 'badge-red';
            return `<tr>
                <td style="font-weight:600;">${c.client}</td>
                <td>${squad ? (squad.icon || '') + ' ' + squad.name : '<span style="color:#bbb;">—</span>'}</td>
                <td class="text-center">${c.videoCount || '—'}</td>
                <td class="text-center">${c.staticCount || '—'}</td>
                <td class="text-center">${c.trafficManagement ? '✓' : ''}</td>
                <td class="text-center">${c.founderBrand ? '✓' : ''}</td>
                <td style="font-size:8px;color:#555;">${teamStr}</td>
                <td class="text-right">${fmtBRL(roi.revenue)}</td>
                <td class="text-right" style="color:#888;">${fmtBRL(roi.cost)}</td>
                <td class="text-center"><span class="badge ${mClass}">${roi.margin.toFixed(0)}%</span></td>
            </tr>`;
        }).join('')}
    </tbody>
</table>

${projects.length > 0 ? `
<div class="section-title">Projetos Pontuais (${periodLabel})</div>
<table>
    <thead><tr><th>Projeto</th><th>Cliente</th><th>Squad</th><th class="text-right">Receita</th><th class="text-right">Custo Ext.</th><th class="text-center">Margem</th></tr></thead>
    <tbody>
        ${projects.map(p => {
            const roi = analyticsService.getProjectROI(p.id, periodId);
            const squad = p.squadId ? squadService.getSquad(p.squadId) : null;
            const mClass = roi.margin >= 40 ? 'badge-green' : roi.margin >= 15 ? 'badge-yellow' : 'badge-red';
            return `<tr>
                <td style="font-weight:600;">${p.name}</td>
                <td>${p.client || '—'}</td>
                <td>${squad ? (squad.icon || '') + ' ' + squad.name : '—'}</td>
                <td class="text-right">${fmtBRL(roi.revenue)}</td>
                <td class="text-right" style="color:#888;">${fmtBRL(p.externalCost || 0)}</td>
                <td class="text-center"><span class="badge ${mClass}">${roi.margin.toFixed(0)}%</span></td>
            </tr>`;
        }).join('')}
    </tbody>
</table>
` : ''}

<!-- ══════ 5. EQUIPE ══════ -->
<div class="section-title section-break">Equipe e Salários</div>
<table>
    <thead><tr><th>Nome</th><th>Cargo</th><th>Squad</th><th class="text-right">Salário</th><th class="text-right">Alocado</th><th class="text-center">Status</th></tr></thead>
    <tbody>
        ${people.map(p => {
            const salary = p.salary || 0;
            const totalAllocated = analyticsService.getPersonTotalAllocated(p.id, periodId);
            const squad = squads.find(s => s.headId === p.id || (s.members || []).includes(p.id));
            const diff = Math.abs(totalAllocated - salary);
            const statusClass = diff < 1 ? 'badge-green' : diff / Math.max(salary, 1) > 0.1 ? 'badge-red' : 'badge-yellow';
            const statusLabel = diff < 1 ? 'OK' : totalAllocated > salary ? 'Acima' : 'Abaixo';
            return `<tr>
                <td style="font-weight:600;">${p.name}</td>
                <td>${p.role}</td>
                <td>${squad ? (squad.icon || '') + ' ' + squad.name : '—'}</td>
                <td class="text-right">${fmtBRL(salary)}</td>
                <td class="text-right" style="font-weight:600;">${fmtBRL(totalAllocated)}</td>
                <td class="text-center"><span class="badge ${statusClass}">${statusLabel}</span></td>
            </tr>`;
        }).join('')}
    </tbody>
</table>

<!-- ══════ 6. CONFERÊNCIA ══════ -->
<div class="section-title">Conferência Salarial</div>
${(() => {
    const divergencias = reconciliation.filter(r => Math.abs(r.allocated - r.salary) >= 1);
    if (divergencias.length === 0) return '<p style="color:#2e7d32;font-size:10px;font-weight:600;margin:8px 0;">✓ Nenhuma divergência — todos os salários batem com o alocado</p>';
    return `<table>
        <thead><tr><th>Nome</th><th>Cargo</th><th class="text-right">Salário</th><th class="text-right">Alocado</th><th class="text-right">Diferença</th><th>Observação</th></tr></thead>
        <tbody>
            ${divergencias.map(r => {
                const diff = r.allocated - r.salary;
                const cls = diff > 0 ? 'red' : 'green';
                return `<tr>
                    <td style="font-weight:600;">${r.name}</td>
                    <td>${r.role}</td>
                    <td class="text-right">${fmtBRL(r.salary)}</td>
                    <td class="text-right">${fmtBRL(r.allocated)}</td>
                    <td class="text-right ${cls}" style="font-weight:700;">${diff > 0 ? '+' : ''}${fmtBRL(diff)}</td>
                    <td style="font-size:8px;">${diff > 0 ? 'Custo alocado excede salário' : 'Capacidade não utilizada'}</td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>`;
})()}

</div><!-- .page -->

<div class="footer">
    Fast Digital 360 — Relatório gerado pelo Fast Analytics &nbsp;|&nbsp; ${periodLabel} &nbsp;|&nbsp; ${new Date().toLocaleString('pt-BR')}
</div>

</body>
</html>`;
}

function fmtBRL(value) {
    const n = Number(value);
    if (isNaN(n)) return 'R$ 0,00';
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
