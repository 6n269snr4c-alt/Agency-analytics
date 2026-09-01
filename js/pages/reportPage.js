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

    // SVG donut - cores escuras pra legibilidade em fundo branco
    function donut(pct, size, stroke, color) {
        const r = (size - stroke) / 2;
        const c = 2 * Math.PI * r;
        const val = Math.max(0, Math.min(100, pct));
        const offset = c - (val / 100) * c;
        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
            <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#e8e8e8" stroke-width="${stroke}"/>
            <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
            <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central" fill="#0D0D0D" font-size="${size*0.26}px" font-weight="800" style="transform:rotate(90deg);transform-origin:center">${pct.toFixed(1)}%</text>
        </svg>`;
    }

    function marginColor(m) { return m >= 40 ? '#1b7a2b' : m >= 20 ? '#c77d00' : '#c62828'; }

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Fast Analytics — ${periodLabel}</title>
<style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 9px; color: #1a1a1a; background: #fff; line-height: 1.45; }

    .toolbar { background: #0D0D0D; color: #C8FF00; padding: 8px 24px; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 12px; }
    .toolbar button { background: #C8FF00; color: #0D0D0D; border: none; padding: 8px 20px; border-radius: 4px; font-weight: 700; font-size: 12px; cursor: pointer; }

    /* Header */
    .rpt-header { background: #0D0D0D; color: #fff; padding: 18px 28px; display: flex; justify-content: space-between; align-items: flex-end; }
    .rpt-brand { font-size: 20px; font-weight: 800; color: #C8FF00; letter-spacing: -0.5px; }
    .rpt-sub { font-size: 9px; color: #888; margin-top: 2px; }
    .rpt-period { font-size: 15px; font-weight: 700; color: #fff; text-align: right; }
    .rpt-meta { font-size: 8px; color: #666; margin-top: 2px; }

    .page { padding: 18px 28px; }

    /* KPI strip */
    .kpi-strip { display: flex; gap: 0; margin-bottom: 20px; border: 2px solid #0D0D0D; border-radius: 8px; overflow: hidden; }
    .kpi-cell { flex: 1; padding: 14px 10px; text-align: center; border-right: 1px solid #e0e0e0; background: #fff; }
    .kpi-cell:last-child { border-right: none; }
    .kpi-cell.hl { background: #0D0D0D; color: #fff; }
    .kpi-val { font-size: 18px; font-weight: 800; }
    .kpi-val-sm { font-size: 14px; font-weight: 800; }
    .kpi-lbl { font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.6px; color: #888; margin-top: 3px; }
    .kpi-cell.hl .kpi-lbl { color: #999; }
    .c-green { color: #1b7a2b; } .c-red { color: #c62828; }
    .c-green-lt { color: #C8FF00; }

    /* Section */
    .sec { font-size: 11px; font-weight: 800; color: #0D0D0D; margin: 22px 0 10px; padding: 4px 10px; background: #f5f5f5; border-left: 4px solid #0D0D0D; page-break-after: avoid; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Squad cards */
    .sq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-bottom: 18px; }
    .sq-card { border: 1px solid #ddd; border-radius: 8px; padding: 14px; page-break-inside: avoid; }
    .sq-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .sq-name { font-size: 13px; font-weight: 800; color: #0D0D0D; }
    .sq-sub { font-size: 8px; color: #888; }
    .sq-donut { display: flex; justify-content: center; margin: 6px 0; }
    .sq-metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin: 8px 0; text-align: center; }
    .sq-m-val { font-size: 11px; font-weight: 700; }
    .sq-m-lbl { font-size: 7px; color: #888; text-transform: uppercase; }
    .sq-bar-lbl { font-size: 7.5px; color: #888; margin-top: 6px; }
    .sq-bar-track { width: 100%; height: 5px; background: #eee; border-radius: 3px; overflow: hidden; margin-top: 2px; }
    .sq-bar-fill { height: 100%; border-radius: 3px; }
    .sq-team { margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee; }
    .sq-person { display: flex; justify-content: space-between; font-size: 8.5px; padding: 2px 0; }
    .sq-p-name { color: #333; } .sq-p-val { color: #666; font-weight: 600; }
    .sq-badge { font-size: 6.5px; background: #0D0D0D; color: #C8FF00; padding: 1px 5px; border-radius: 3px; margin-left: 3px; font-weight: 700; }

    /* Role comparison */
    .role-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; margin-bottom: 16px; }
    .role-card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; page-break-inside: avoid; }
    .role-title { font-size: 10px; font-weight: 700; color: #0D0D0D; margin-bottom: 6px; }
    .role-row { display: flex; align-items: center; gap: 6px; padding: 3px 0; }
    .role-person { width: 100px; font-size: 8.5px; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .role-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .role-fill { height: 100%; border-radius: 4px; }
    .role-val { width: 95px; text-align: right; font-size: 8px; color: #666; }
    .role-best { font-size: 6px; background: #1b7a2b; color: #fff; padding: 1px 5px; border-radius: 8px; margin-left: 3px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 8.5px; }
    thead th { font-weight: 600; text-align: left; padding: 6px 6px; border-bottom: 2px solid #0D0D0D; font-size: 7.5px; text-transform: uppercase; color: #555; letter-spacing: 0.3px; background: #f8f8f8; }
    td { padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr { page-break-inside: avoid; }
    .text-right { text-align: right; } .text-center { text-align: center; }
    .td-client { font-weight: 700; color: #0D0D0D; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 7.5px; font-weight: 700; }
    .b-green  { background: #e8f5e9; color: #1b7a2b; }
    .b-yellow { background: #fff8e1; color: #c77d00; }
    .b-red    { background: #fce4ec; color: #c62828; }

    .section-break { page-break-before: always; }
    .footer { padding: 10px 28px; border-top: 2px solid #0D0D0D; font-size: 7.5px; color: #888; text-align: center; margin-top: 20px; }

    @media print { .no-print { display: none !important; } .rpt-header, .sq-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="no-print toolbar">
    <span>⚡ Relatório pronto — Ctrl+P (⌘P) → Salvar como PDF</span>
    <button onclick="window.print()">Salvar como PDF</button>
</div>

<div class="rpt-header">
    <div><div class="rpt-brand">⚡ FAST ANALYTICS</div><div class="rpt-sub">Fast Digital 360 — Relatório Operacional</div></div>
    <div><div class="rpt-period">${periodLabel}</div><div class="rpt-meta">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</div></div>
</div>

<div class="page">

<div class="kpi-strip">
    <div class="kpi-cell"><div class="kpi-val c-green">${fmtBRL(overall.revenue)}</div><div class="kpi-lbl">Receita</div></div>
    <div class="kpi-cell"><div class="kpi-val c-red">${fmtBRL(overall.cost)}</div><div class="kpi-lbl">Custos</div></div>
    <div class="kpi-cell hl"><div class="kpi-val c-green-lt">${fmtBRL(overall.profit)}</div><div class="kpi-lbl">Lucro Bruto</div></div>
    <div class="kpi-cell hl"><div class="kpi-val c-green-lt" style="font-size:22px;">${overall.margin.toFixed(1)}%</div><div class="kpi-lbl">Margem</div></div>
    <div class="kpi-cell"><div class="kpi-val-sm">${contracts.length}</div><div class="kpi-lbl">Contratos</div></div>
    <div class="kpi-cell"><div class="kpi-val-sm">${people.length}</div><div class="kpi-lbl">Pessoas</div></div>
</div>

<div class="sec">Performance por Squad</div>
<div class="sq-grid">
${allDRE.map(dre => {
    const mc = marginColor(dre.margin);
    const revPct = (dre.revenue.total / Math.max(overall.revenue, 1) * 100);
    return `
    <div class="sq-card" style="border-top:4px solid ${mc};">
        <div class="sq-head">
            <div><div class="sq-name">${dre.squadIcon || ''} ${dre.squadName}</div><div class="sq-sub">${dre.contractCount} contrato${dre.contractCount !== 1 ? 's' : ''}${dre.projectCount > 0 ? ` + ${dre.projectCount} projeto${dre.projectCount !== 1 ? 's' : ''}` : ''}</div></div>
        </div>
        <div class="sq-donut">${donut(dre.margin, 72, 5, mc)}</div>
        <div class="sq-metrics">
            <div><div class="sq-m-val c-green">${fmtBRL(dre.revenue.total)}</div><div class="sq-m-lbl">Receita</div></div>
            <div><div class="sq-m-val c-red">${fmtBRL(dre.costs.total)}</div><div class="sq-m-lbl">Custos</div></div>
            <div><div class="sq-m-val" style="color:${mc}">${fmtBRL(dre.grossProfit)}</div><div class="sq-m-lbl">Lucro</div></div>
        </div>
        <div class="sq-bar-lbl">${revPct.toFixed(0)}% da receita total</div>
        <div class="sq-bar-track"><div class="sq-bar-fill" style="width:${revPct.toFixed(1)}%;background:${mc};"></div></div>
        <div class="sq-team">
            ${dre.costs.headMaster ? `<div class="sq-person"><span class="sq-p-name">👑 ${dre.costs.headMaster.name}<span class="sq-badge">MASTER</span></span><span class="sq-p-val">${fmtBRL(dre.costs.totalHeadMaster)}</span></div>` : ''}
            ${dre.costs.head ? `<div class="sq-person"><span class="sq-p-name">👤 ${dre.costs.head.name}<span class="sq-badge">HEAD</span></span><span class="sq-p-val">${fmtBRL(dre.costs.totalHead)}</span></div>` : ''}
            ${(dre.costs.members || []).map(m => `<div class="sq-person"><span class="sq-p-name">${m.name}</span><span class="sq-p-val">${fmtBRL(m.cost)}</span></div>`).join('')}
        </div>
    </div>`;
}).join('')}
</div>

${roleComparisons.length > 0 ? `
<div class="sec">Eficiência por Cargo</div>
<div class="role-grid">
${roleComparisons.map(({ role, people: ppl }) => {
    const maxCost = Math.max(...ppl.map(p => p.costPerDeliverable));
    const unitLabel = ppl[0]?.deliveryKind === 'head' ? '/cliente' : ppl[0]?.deliveryKind === 'traffic' ? '/contrato' : '/entrega';
    return `<div class="role-card">
        <div class="role-title">${role}</div>
        ${ppl.map((p, i) => {
            const pct = maxCost > 0 ? (p.costPerDeliverable / maxCost * 100) : 0;
            const color = i === 0 ? '#1b7a2b' : '#5c7cfa';
            return `<div class="role-row">
                <span class="role-person">${p.name}${i === 0 ? '<span class="role-best">MELHOR</span>' : ''}</span>
                <div class="role-track"><div class="role-fill" style="width:${pct.toFixed(1)}%;background:${color};"></div></div>
                <span class="role-val">${fmtBRL(p.costPerDeliverable)}${unitLabel}</span>
            </div>`;
        }).join('')}
    </div>`;
}).join('')}
</div>` : ''}

<div class="sec section-break">Contratos</div>
<table>
    <thead><tr><th>Cliente</th><th>Squad</th><th class="text-center">🎬</th><th class="text-center">🖼️</th><th class="text-center">📣</th><th class="text-center">🎤</th><th>Equipe</th><th class="text-right">Receita</th><th class="text-right">Custo</th><th class="text-center">Margem</th></tr></thead>
    <tbody>${contracts.map(c => {
        const roi = analyticsService.getContractROI(c.id, periodId, includeProjects);
        const squad = c.squadTag ? squadService.getSquad(c.squadTag) : null;
        const teamStr = roi.costBreakdown.map(b => b.name).join(', ') || '—';
        const mClass = roi.margin >= 40 ? 'b-green' : roi.margin >= 15 ? 'b-yellow' : 'b-red';
        return `<tr>
            <td class="td-client">${c.client}</td>
            <td>${squad ? (squad.icon || '') + ' ' + squad.name : '—'}</td>
            <td class="text-center">${c.videoCount || '—'}</td>
            <td class="text-center">${c.staticCount || '—'}</td>
            <td class="text-center">${c.trafficManagement ? '✓' : ''}</td>
            <td class="text-center">${c.founderBrand ? '✓' : ''}</td>
            <td style="font-size:7.5px;color:#666;">${teamStr}</td>
            <td class="text-right c-green" style="font-weight:600;">${fmtBRL(roi.revenue)}</td>
            <td class="text-right" style="color:#888;">${fmtBRL(roi.cost)}</td>
            <td class="text-center"><span class="badge ${mClass}">${roi.margin.toFixed(0)}%</span></td>
        </tr>`;
    }).join('')}</tbody>
</table>

${projects.length > 0 ? `
<div class="sec">Projetos Pontuais — ${periodLabel}</div>
<table>
    <thead><tr><th>Projeto</th><th>Cliente</th><th>Squad</th><th class="text-right">Receita</th><th class="text-right">Custo Ext.</th><th class="text-center">Margem</th></tr></thead>
    <tbody>${projects.map(p => {
        const roi = analyticsService.getProjectROI(p.id, periodId);
        const squad = p.squadId ? squadService.getSquad(p.squadId) : null;
        const mClass = roi.margin >= 40 ? 'b-green' : roi.margin >= 15 ? 'b-yellow' : 'b-red';
        return `<tr><td class="td-client">${p.name}</td><td>${p.client || '—'}</td><td>${squad ? (squad.icon||'')+' '+squad.name : '—'}</td><td class="text-right c-green" style="font-weight:600;">${fmtBRL(roi.revenue)}</td><td class="text-right" style="color:#888;">${fmtBRL(p.externalCost||0)}</td><td class="text-center"><span class="badge ${mClass}">${roi.margin.toFixed(0)}%</span></td></tr>`;
    }).join('')}</tbody>
</table>` : ''}

<div class="sec section-break">Equipe</div>
<table>
    <thead><tr><th>Nome</th><th>Cargo</th><th>Squad</th><th class="text-right">Salário</th><th class="text-right">Alocado</th><th class="text-center">Status</th></tr></thead>
    <tbody>${people.map(p => {
        const salary = p.salary || 0;
        const alloc = analyticsService.getPersonTotalAllocated(p.id, periodId);
        const squad = squads.find(s => s.headId === p.id || (s.members||[]).includes(p.id));
        const diff = Math.abs(alloc - salary);
        const sc = diff < 1 ? 'b-green' : diff/Math.max(salary,1) > 0.1 ? 'b-red' : 'b-yellow';
        const sl = diff < 1 ? 'OK' : alloc > salary ? 'Acima' : 'Abaixo';
        return `<tr><td class="td-client">${p.name}</td><td>${p.role}</td><td>${squad ? (squad.icon||'')+' '+squad.name : '—'}</td><td class="text-right">${fmtBRL(salary)}</td><td class="text-right" style="font-weight:700;">${fmtBRL(alloc)}</td><td class="text-center"><span class="badge ${sc}">${sl}</span></td></tr>`;
    }).join('')}</tbody>
</table>

<div class="sec">Conferência Salarial</div>
${(() => {
    const divs = reconciliation.filter(r => Math.abs(r.allocated - r.salary) >= 1);
    if (divs.length === 0) return '<p style="color:#1b7a2b;font-size:10px;font-weight:600;margin:8px 0;">✓ Nenhuma divergência — todos os salários batem com o alocado</p>';
    return `<table><thead><tr><th>Nome</th><th>Cargo</th><th class="text-right">Salário</th><th class="text-right">Alocado</th><th class="text-right">Diferença</th></tr></thead><tbody>${divs.map(r => {
        const d = r.allocated - r.salary;
        return `<tr><td class="td-client">${r.name}</td><td>${r.role}</td><td class="text-right">${fmtBRL(r.salary)}</td><td class="text-right">${fmtBRL(r.allocated)}</td><td class="text-right" style="color:${d>0?'#c62828':'#1b7a2b'};font-weight:700;">${d>0?'+':''}${fmtBRL(d)}</td></tr>`;
    }).join('')}</tbody></table>`;
})()}

</div>
<div class="footer">Fast Digital 360 — Fast Analytics · ${periodLabel} · ${new Date().toLocaleString('pt-BR')}</div>
</body></html>`;
}

function fmtBRL(value) {
    const n = Number(value);
    if (isNaN(n)) return 'R$ 0,00';
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
