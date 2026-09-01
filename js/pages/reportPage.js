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

    // Sem squad
    const unassignedContracts = contracts.filter(c => !c.squadTag);
    const unassignedProjects  = projects.filter(p => !p.squadId);
    if (unassignedContracts.length > 0 || unassignedProjects.length > 0) {
        const uRevenue = unassignedContracts.reduce((s, c) => s + (c.value || 0), 0) + unassignedProjects.reduce((s, p) => s + (p.value || 0), 0);
        const uCostItems = []; let uTotalCost = 0;
        unassignedContracts.forEach(c => { const roi = analyticsService.getContractROI(c.id, periodId, includeProjects); uTotalCost += roi.cost; roi.costBreakdown.forEach(item => { const ex = uCostItems.find(x => x.personId === item.personId); if (ex) ex.cost += item.totalCost; else uCostItems.push({ personId: item.personId, name: item.name, role: item.role, cost: item.totalCost, isHead: item.isHead }); }); });
        unassignedProjects.forEach(p => { uTotalCost += analyticsService.getProjectROI(p.id, periodId).cost; });
        const uProfit = uRevenue - uTotalCost; const uMargin = uRevenue > 0 ? (uProfit / uRevenue) * 100 : 0;
        allDRE.push({ squadIcon: '📦', squadName: 'Sem Squad', contractCount: unassignedContracts.length, projectCount: unassignedProjects.length,
            revenue: { total: uRevenue, perContract: unassignedContracts.map(c => ({ client: c.client, value: c.value || 0 })), perProject: unassignedProjects.map(p => ({ client: p.client || p.name, value: p.value || 0 })) },
            costs: { total: uTotalCost, members: uCostItems.filter(i => !i.isHead), totalMembers: uCostItems.filter(i => !i.isHead).reduce((s, i) => s + i.cost, 0), head: null, totalHead: 0, headMaster: uCostItems.find(i => i.isHead && i.name.includes('Master')) || null, totalHeadMaster: (uCostItems.find(i => i.isHead && i.name.includes('Master')) || {}).cost || 0, totalExternalProjects: 0 },
            grossProfit: uProfit, margin: uMargin });
    }

    // Role comparisons
    const roleComparisons = [];
    roles.forEach(role => {
        const comparison = analyticsService.comparePeopleByRole(role).filter(p => p.costPerDeliverable > 0);
        if (comparison.length >= 2) roleComparisons.push({ role, people: [...comparison].sort((a, b) => a.costPerDeliverable - b.costPerDeliverable) });
    });

    // SVG donut
    function donut(pct, size, stroke, color) {
        const r = (size - stroke) / 2;
        const c = 2 * Math.PI * r;
        const val = Math.max(0, Math.min(100, pct));
        const offset = c - (val / 100) * c;
        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
            <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#2a2a2a" stroke-width="${stroke}"/>
            <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
            <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central" fill="${color}" font-size="${size*0.28}px" font-weight="800" style="transform:rotate(90deg);transform-origin:center">${pct.toFixed(1)}%</text>
        </svg>`;
    }

    function marginColor(m) { return m >= 40 ? '#C8FF00' : m >= 20 ? '#FFB300' : '#FF5252'; }

    // Cost bar (horizontal)
    function costBar(value, maxVal, color) {
        const pct = maxVal > 0 ? (value / maxVal * 100) : 0;
        return `<div style="width:100%;height:4px;background:#1a1a1a;border-radius:2px;overflow:hidden;margin-top:2px;">
            <div style="width:${pct.toFixed(1)}%;height:100%;background:${color};border-radius:2px;"></div></div>`;
    }

    const maxSquadRevenue = Math.max(...allDRE.map(d => d.revenue.total), 1);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Fast Analytics — ${periodLabel}</title>
<style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 9px; color: #e0e0e0; background: #0D0D0D; line-height: 1.4; }

    .toolbar { background: #C8FF00; color: #0D0D0D; padding: 8px 24px; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 12px; }
    .toolbar button { background: #0D0D0D; color: #C8FF00; border: none; padding: 8px 20px; border-radius: 4px; font-weight: 700; font-size: 12px; cursor: pointer; }

    .page { padding: 20px 28px; }

    /* Header */
    .rpt-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 14px; border-bottom: 2px solid #C8FF00; margin-bottom: 20px; }
    .rpt-brand { font-size: 22px; font-weight: 800; color: #C8FF00; letter-spacing: -0.5px; }
    .rpt-sub { font-size: 9px; color: #666; margin-top: 2px; }
    .rpt-period { font-size: 15px; font-weight: 700; color: #fff; text-align: right; }
    .rpt-meta { font-size: 8px; color: #555; margin-top: 2px; }

    /* KPI row */
    .kpi-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .kpi-box { flex: 1; background: #141414; border: 1px solid #1e1e1e; border-radius: 10px; padding: 16px; text-align: center; }
    .kpi-box.accent { border-color: #C8FF00; background: linear-gradient(135deg, #141414 0%, #1a1f10 100%); }
    .kpi-val { font-size: 20px; font-weight: 800; }
    .kpi-lbl { font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.8px; color: #666; margin-top: 4px; }
    .green { color: #C8FF00; } .red { color: #FF5252; } .amber { color: #FFB300; } .white { color: #fff; }

    /* Section */
    .sec-title { font-size: 11px; font-weight: 700; color: #C8FF00; margin: 24px 0 12px; padding-bottom: 5px; border-bottom: 1px solid #222; text-transform: uppercase; letter-spacing: 1px; page-break-after: avoid; }

    /* Squad cards */
    .sq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .sq-card { background: #141414; border: 1px solid #1e1e1e; border-radius: 10px; padding: 16px; page-break-inside: avoid; position: relative; overflow: hidden; }
    .sq-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 10px 10px 0 0; }
    .sq-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .sq-name { font-size: 14px; font-weight: 800; color: #fff; }
    .sq-desc { font-size: 8px; color: #555; margin-top: 2px; }
    .sq-donut { display: flex; justify-content: center; margin: 8px 0; }
    .sq-metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 10px 0; text-align: center; }
    .sq-metric-val { font-size: 12px; font-weight: 700; }
    .sq-metric-lbl { font-size: 7px; color: #555; text-transform: uppercase; }
    .sq-bar-label { display: flex; justify-content: space-between; font-size: 8px; color: #555; margin-top: 8px; }
    .sq-bar-track { width: 100%; height: 6px; background: #1a1a1a; border-radius: 3px; overflow: hidden; margin-top: 3px; }
    .sq-bar-fill { height: 100%; border-radius: 3px; }
    .sq-team { margin-top: 10px; padding-top: 8px; border-top: 1px solid #1e1e1e; }
    .sq-person { display: flex; justify-content: space-between; font-size: 8.5px; padding: 2.5px 0; }
    .sq-person-name { color: #aaa; } .sq-person-val { color: #888; font-weight: 600; }
    .sq-person-badge { font-size: 7px; background: #1e1e1e; color: #888; padding: 1px 5px; border-radius: 4px; margin-left: 4px; }

    /* Role comparison */
    .role-block { background: #141414; border: 1px solid #1e1e1e; border-radius: 10px; padding: 14px; margin-bottom: 10px; page-break-inside: avoid; }
    .role-name { font-size: 10px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .role-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .role-person { width: 110px; font-size: 8.5px; font-weight: 600; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .role-track { flex: 1; height: 8px; background: #1a1a1a; border-radius: 4px; overflow: hidden; }
    .role-fill { height: 100%; border-radius: 4px; }
    .role-val { width: 100px; text-align: right; font-size: 8px; color: #888; }
    .role-best { font-size: 6.5px; background: rgba(200,255,0,0.15); color: #C8FF00; padding: 1px 6px; border-radius: 8px; margin-left: 4px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 8.5px; }
    thead th { font-weight: 600; text-align: left; padding: 6px 7px; border-bottom: 1px solid #2a2a2a; font-size: 7.5px; text-transform: uppercase; color: #555; letter-spacing: 0.4px; }
    td { padding: 5px 7px; border-bottom: 1px solid #151515; vertical-align: top; color: #bbb; }
    tr { page-break-inside: avoid; }
    tbody tr:hover { background: #161616; }
    .text-right { text-align: right; } .text-center { text-align: center; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 7.5px; font-weight: 700; }
    .badge-green  { background: rgba(200,255,0,0.12); color: #C8FF00; }
    .badge-yellow { background: rgba(255,179,0,0.12); color: #FFB300; }
    .badge-red    { background: rgba(255,82,82,0.12); color: #FF5252; }
    .td-client { font-weight: 600; color: #fff; }

    .section-break { page-break-before: always; }
    .footer { margin-top: 24px; padding: 10px 28px; border-top: 1px solid #1e1e1e; font-size: 7.5px; color: #333; text-align: center; }

    @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="no-print toolbar">
    <span>⚡ Relatório pronto — Ctrl+P (⌘P) → Salvar como PDF</span>
    <button onclick="window.print()">Salvar como PDF</button>
</div>

<div class="page">

<!-- ═══ HEADER ═══ -->
<div class="rpt-header">
    <div>
        <div class="rpt-brand">⚡ FAST ANALYTICS</div>
        <div class="rpt-sub">Fast Digital 360 — Relatório Operacional</div>
    </div>
    <div>
        <div class="rpt-period">${periodLabel}</div>
        <div class="rpt-meta">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</div>
    </div>
</div>

<!-- ═══ KPIs ═══ -->
<div class="kpi-row">
    <div class="kpi-box">
        <div class="kpi-val green">${fmtBRL(overall.revenue)}</div>
        <div class="kpi-lbl">Receita</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-val red">${fmtBRL(overall.cost)}</div>
        <div class="kpi-lbl">Custos</div>
    </div>
    <div class="kpi-box accent">
        <div class="kpi-val" style="color:${overall.profit >= 0 ? '#C8FF00' : '#FF5252'}">${fmtBRL(overall.profit)}</div>
        <div class="kpi-lbl">Lucro Bruto</div>
    </div>
    <div class="kpi-box accent">
        ${donut(overall.margin, 64, 5, marginColor(overall.margin))}
        <div class="kpi-lbl">Margem</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-val white">${contracts.length}</div>
        <div class="kpi-lbl">Contratos</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-val white">${people.length}</div>
        <div class="kpi-lbl">Pessoas</div>
    </div>
</div>

<!-- ═══ SQUADS ═══ -->
<div class="sec-title">Performance por Squad</div>
<div class="sq-grid">
${allDRE.map(dre => {
    const mc = marginColor(dre.margin);
    const revPct = (dre.revenue.total / Math.max(overall.revenue, 1) * 100);
    const maxCost = Math.max(...[...(dre.costs.members || []).map(m => m.cost), dre.costs.totalHead || 0, dre.costs.totalHeadMaster || 0].filter(v => v > 0), 1);
    return `
    <div class="sq-card" style="border-top: 3px solid ${mc};">
        <div class="sq-head">
            <div>
                <div class="sq-name">${dre.squadIcon || ''} ${dre.squadName}</div>
                <div class="sq-desc">${dre.contractCount} contrato${dre.contractCount !== 1 ? 's' : ''}${dre.projectCount > 0 ? ` + ${dre.projectCount} projeto${dre.projectCount !== 1 ? 's' : ''}` : ''}</div>
            </div>
        </div>
        <div class="sq-donut">${donut(dre.margin, 80, 6, mc)}</div>
        <div class="sq-metrics">
            <div><div class="sq-metric-val green">${fmtBRL(dre.revenue.total)}</div><div class="sq-metric-lbl">Receita</div></div>
            <div><div class="sq-metric-val red">${fmtBRL(dre.costs.total)}</div><div class="sq-metric-lbl">Custos</div></div>
            <div><div class="sq-metric-val" style="color:${mc}">${fmtBRL(dre.grossProfit)}</div><div class="sq-metric-lbl">Lucro</div></div>
        </div>
        <div class="sq-bar-label"><span>${revPct.toFixed(0)}% da receita total</span></div>
        <div class="sq-bar-track"><div class="sq-bar-fill" style="width:${revPct.toFixed(1)}%;background:${mc};"></div></div>
        <div class="sq-team">
            ${dre.costs.headMaster ? `<div class="sq-person"><span class="sq-person-name">👑 ${dre.costs.headMaster.name}<span class="sq-person-badge">master</span></span><span class="sq-person-val">${fmtBRL(dre.costs.totalHeadMaster)}</span></div>` : ''}
            ${dre.costs.head ? `<div class="sq-person"><span class="sq-person-name">👤 ${dre.costs.head.name}<span class="sq-person-badge">head</span></span><span class="sq-person-val">${fmtBRL(dre.costs.totalHead)}</span></div>` : ''}
            ${(dre.costs.members || []).map(m => `<div class="sq-person"><span class="sq-person-name">${m.name}</span><span class="sq-person-val">${fmtBRL(m.cost)}</span></div>`).join('')}
        </div>
    </div>`;
}).join('')}
</div>

<!-- ═══ EFICIÊNCIA ═══ -->
${roleComparisons.length > 0 ? `
<div class="sec-title">Eficiência por Cargo</div>
<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px;">
${roleComparisons.map(({ role, people: ppl }) => {
    const maxCost = Math.max(...ppl.map(p => p.costPerDeliverable));
    const unitLabel = ppl[0]?.deliveryKind === 'head' ? '/cliente' : ppl[0]?.deliveryKind === 'traffic' ? '/contrato' : '/entrega';
    return `<div class="role-block">
        <div class="role-name">${role}</div>
        ${ppl.map((p, i) => {
            const pct = maxCost > 0 ? (p.costPerDeliverable / maxCost * 100) : 0;
            const color = i === 0 ? '#C8FF00' : '#3d5afe';
            return `<div class="role-row">
                <span class="role-person">${p.name}${i === 0 ? '<span class="role-best">mais eficiente</span>' : ''}</span>
                <div class="role-track"><div class="role-fill" style="width:${pct.toFixed(1)}%;background:${color};"></div></div>
                <span class="role-val">${fmtBRL(p.costPerDeliverable)}${unitLabel}</span>
            </div>`;
        }).join('')}
    </div>`;
}).join('')}
</div>
` : ''}

<!-- ═══ CONTRATOS ═══ -->
<div class="sec-title section-break">Contratos</div>
<table>
    <thead><tr>
        <th>Cliente</th><th>Squad</th><th class="text-center">🎬</th><th class="text-center">🖼️</th><th class="text-center">📣</th><th class="text-center">🎤</th>
        <th>Equipe</th><th class="text-right">Receita</th><th class="text-right">Custo</th><th class="text-center">Margem</th>
    </tr></thead>
    <tbody>${contracts.map(c => {
        const roi = analyticsService.getContractROI(c.id, periodId, includeProjects);
        const squad = c.squadTag ? squadService.getSquad(c.squadTag) : null;
        const teamStr = roi.costBreakdown.map(b => b.name).join(', ') || '—';
        const mClass = roi.margin >= 40 ? 'badge-green' : roi.margin >= 15 ? 'badge-yellow' : 'badge-red';
        return `<tr>
            <td class="td-client">${c.client}</td>
            <td>${squad ? (squad.icon || '') + ' ' + squad.name : '<span style="color:#333">—</span>'}</td>
            <td class="text-center">${c.videoCount || '<span style="color:#333">—</span>'}</td>
            <td class="text-center">${c.staticCount || '<span style="color:#333">—</span>'}</td>
            <td class="text-center">${c.trafficManagement ? '✓' : ''}</td>
            <td class="text-center">${c.founderBrand ? '✓' : ''}</td>
            <td style="font-size:7.5px;color:#666;">${teamStr}</td>
            <td class="text-right" style="color:#C8FF00;">${fmtBRL(roi.revenue)}</td>
            <td class="text-right" style="color:#888;">${fmtBRL(roi.cost)}</td>
            <td class="text-center"><span class="badge ${mClass}">${roi.margin.toFixed(0)}%</span></td>
        </tr>`;
    }).join('')}</tbody>
</table>

${projects.length > 0 ? `
<div class="sec-title">Projetos Pontuais — ${periodLabel}</div>
<table>
    <thead><tr><th>Projeto</th><th>Cliente</th><th>Squad</th><th class="text-right">Receita</th><th class="text-right">Custo Ext.</th><th class="text-center">Margem</th></tr></thead>
    <tbody>${projects.map(p => {
        const roi = analyticsService.getProjectROI(p.id, periodId);
        const squad = p.squadId ? squadService.getSquad(p.squadId) : null;
        const mClass = roi.margin >= 40 ? 'badge-green' : roi.margin >= 15 ? 'badge-yellow' : 'badge-red';
        return `<tr><td class="td-client">${p.name}</td><td>${p.client || '—'}</td><td>${squad ? (squad.icon || '') + ' ' + squad.name : '—'}</td><td class="text-right" style="color:#C8FF00;">${fmtBRL(roi.revenue)}</td><td class="text-right" style="color:#888;">${fmtBRL(p.externalCost || 0)}</td><td class="text-center"><span class="badge ${mClass}">${roi.margin.toFixed(0)}%</span></td></tr>`;
    }).join('')}</tbody>
</table>` : ''}

<!-- ═══ EQUIPE ═══ -->
<div class="sec-title section-break">Equipe</div>
<table>
    <thead><tr><th>Nome</th><th>Cargo</th><th>Squad</th><th class="text-right">Salário</th><th class="text-right">Alocado</th><th class="text-center">Status</th></tr></thead>
    <tbody>${people.map(p => {
        const salary = p.salary || 0;
        const totalAllocated = analyticsService.getPersonTotalAllocated(p.id, periodId);
        const squad = squads.find(s => s.headId === p.id || (s.members || []).includes(p.id));
        const diff = Math.abs(totalAllocated - salary);
        const sc = diff < 1 ? 'badge-green' : diff / Math.max(salary, 1) > 0.1 ? 'badge-red' : 'badge-yellow';
        const sl = diff < 1 ? 'OK' : totalAllocated > salary ? 'Acima' : 'Abaixo';
        return `<tr><td class="td-client">${p.name}</td><td>${p.role}</td><td>${squad ? (squad.icon || '') + ' ' + squad.name : '—'}</td><td class="text-right">${fmtBRL(salary)}</td><td class="text-right" style="font-weight:700;">${fmtBRL(totalAllocated)}</td><td class="text-center"><span class="badge ${sc}">${sl}</span></td></tr>`;
    }).join('')}</tbody>
</table>

<!-- ═══ CONFERÊNCIA ═══ -->
<div class="sec-title">Conferência Salarial</div>
${(() => {
    const divs = reconciliation.filter(r => Math.abs(r.allocated - r.salary) >= 1);
    if (divs.length === 0) return '<p style="color:#C8FF00;font-size:10px;font-weight:600;margin:8px 0;">✓ Nenhuma divergência</p>';
    return `<table><thead><tr><th>Nome</th><th>Cargo</th><th class="text-right">Salário</th><th class="text-right">Alocado</th><th class="text-right">Diferença</th></tr></thead><tbody>${divs.map(r => {
        const d = r.allocated - r.salary;
        return `<tr><td class="td-client">${r.name}</td><td>${r.role}</td><td class="text-right">${fmtBRL(r.salary)}</td><td class="text-right">${fmtBRL(r.allocated)}</td><td class="text-right" style="color:${d > 0 ? '#FF5252' : '#C8FF00'};font-weight:700;">${d > 0 ? '+' : ''}${fmtBRL(d)}</td></tr>`;
    }).join('')}</tbody></table>`;
})()}

</div>

<div class="footer">Fast Digital 360 — Fast Analytics &nbsp;·&nbsp; ${periodLabel} &nbsp;·&nbsp; ${new Date().toLocaleString('pt-BR')}</div>

</body></html>`;
}

function fmtBRL(value) {
    const n = Number(value);
    if (isNaN(n)) return 'R$ 0,00';
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
