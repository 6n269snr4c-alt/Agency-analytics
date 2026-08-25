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
            squadIcon: '📦', squadName: 'Sem Squad', squadDescription: 'Contratos e projetos sem squad definido',
            contractCount: unassignedContracts.length, projectCount: unassignedProjects.length,
            deliverables: unassignedContracts.reduce((acc, c) => {
                acc.video += c.videoCount || 0; acc.static += c.staticCount || 0;
                if (c.trafficManagement) acc.trafficCount++; if (c.founderBrand) acc.founderBrandCount++;
                return acc;
            }, { video: 0, static: 0, trafficCount: 0, founderBrandCount: 0 }),
            revenue: {
                total: uRevenue,
                perContract: unassignedContracts.map(c => ({ client: c.client, value: c.value || 0 })),
                perProject: unassignedProjects.map(p => ({ client: p.client || p.name, value: p.value || 0, isProject: true })),
            },
            costs: {
                total: uTotalCost,
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

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório Fast Analytics — ${periodLabel}</title>
<style>
    @page { size: A4 landscape; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 10px; color: #1a1a1a; background: #fff; line-height: 1.5; padding: 12px; }

    .report-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0D0D0D; padding-bottom: 10px; margin-bottom: 16px; }
    .report-header h1 { font-size: 18px; font-weight: 800; }
    .report-header .period { font-size: 14px; color: #555; }
    .report-header .brand { font-size: 11px; color: #888; }

    h2 { font-size: 13px; font-weight: 700; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e0e0e0; page-break-after: avoid; }
    h3 { font-size: 11px; font-weight: 700; margin: 12px 0 6px; color: #333; page-break-after: avoid; }

    .kpi-row { display: flex; gap: 12px; margin-bottom: 14px; }
    .kpi-box { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 10px; text-align: center; }
    .kpi-value { font-size: 16px; font-weight: 800; }
    .kpi-label { font-size: 9px; text-transform: uppercase; color: #666; margin-top: 2px; }
    .kpi-green { color: #2e7d32; }
    .kpi-red   { color: #c62828; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5px; page-break-inside: auto; }
    thead { background: #f5f5f5; }
    th { font-weight: 700; text-align: left; padding: 5px 6px; border-bottom: 2px solid #ccc; font-size: 8.5px; text-transform: uppercase; color: #555; }
    td { padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr { page-break-inside: avoid; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-muted { color: #999; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
    .badge-green  { background: #e8f5e9; color: #2e7d32; }
    .badge-yellow { background: #fff8e1; color: #f57f17; }
    .badge-red    { background: #fce4ec; color: #c62828; }

    .section-break { page-break-before: always; }
    .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 8px; color: #aaa; text-align: center; }

    @media print {
        body { padding: 0; }
        .no-print { display: none; }
    }
</style>
</head>
<body>

<div class="no-print" style="background:#0D0D0D; color:#fff; padding:10px 16px; margin:-12px -12px 16px; border-radius:0; display:flex; justify-content:space-between; align-items:center;">
    <span>⚡ Relatório pronto — use <strong>Ctrl+P</strong> (⌘P) → Salvar como PDF</span>
    <button onclick="window.print()" style="background:#C8FF00; color:#0D0D0D; border:none; padding:6px 16px; border-radius:4px; font-weight:700; cursor:pointer;">🖨️ Imprimir / Salvar PDF</button>
</div>

<!-- ── CABEÇALHO ── -->
<div class="report-header">
    <div>
        <h1>⚡ Fast Analytics</h1>
        <div class="brand">Fast Digital 360 — Relatório Operacional</div>
    </div>
    <div style="text-align:right">
        <div class="period">${periodLabel}</div>
        <div class="brand">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</div>
    </div>
</div>

<!-- ── VISÃO GERAL ── -->
<h2>1. Visão Geral da Agência</h2>
<div class="kpi-row">
    <div class="kpi-box">
        <div class="kpi-value">${fmtBRL(overall.revenue)}</div>
        <div class="kpi-label">Receita Total</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-value">${fmtBRL(overall.cost)}</div>
        <div class="kpi-label">Custo Total</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-value ${overall.profit >= 0 ? 'kpi-green' : 'kpi-red'}">${fmtBRL(overall.profit)}</div>
        <div class="kpi-label">Lucro Bruto</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-value ${overall.margin >= 30 ? 'kpi-green' : overall.margin >= 0 ? '' : 'kpi-red'}">${overall.margin.toFixed(1)}%</div>
        <div class="kpi-label">Margem</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-value">${contracts.length}</div>
        <div class="kpi-label">Contratos Ativos</div>
    </div>
    <div class="kpi-box">
        <div class="kpi-value">${people.length}</div>
        <div class="kpi-label">Pessoas</div>
    </div>
</div>

<!-- ── DRE POR SQUAD ── -->
<h2>2. DRE por Squad</h2>
${allDRE.map(dre => `
    <h3>${dre.squadIcon || ''} ${dre.squadName} — ${dre.contractCount} contrato(s)${dre.projectCount > 0 ? ` + ${dre.projectCount} projeto(s)` : ''}</h3>
    <div class="kpi-row" style="margin-bottom:6px;">
        <div class="kpi-box" style="flex:0 0 auto; min-width:100px;">
            <div class="kpi-value" style="font-size:13px;">${fmtBRL(dre.revenue.total)}</div>
            <div class="kpi-label">Receita</div>
        </div>
        <div class="kpi-box" style="flex:0 0 auto; min-width:100px;">
            <div class="kpi-value" style="font-size:13px;">${fmtBRL(dre.costs.total)}</div>
            <div class="kpi-label">Custo</div>
        </div>
        <div class="kpi-box" style="flex:0 0 auto; min-width:80px;">
            <div class="kpi-value ${dre.margin >= 30 ? 'kpi-green' : dre.margin >= 0 ? '' : 'kpi-red'}" style="font-size:13px;">${dre.margin.toFixed(1)}%</div>
            <div class="kpi-label">Margem</div>
        </div>
    </div>
    <table>
        <thead><tr><th>Tipo</th><th>Nome</th><th>Cargo</th><th class="text-right">Custo</th></tr></thead>
        <tbody>
            ${dre.costs.headMaster ? `<tr><td>👑 Head Master</td><td>${dre.costs.headMaster.name}</td><td>${dre.costs.headMaster.role}</td><td class="text-right">${fmtBRL(dre.costs.totalHeadMaster)}</td></tr>` : ''}
            ${dre.costs.head ? `<tr><td>👤 Head</td><td>${dre.costs.head.name}</td><td>${dre.costs.head.role}</td><td class="text-right">${fmtBRL(dre.costs.totalHead)}</td></tr>` : ''}
            ${dre.costs.members.map(m => `<tr><td>🧑‍💻 Membro</td><td>${m.name}</td><td>${m.role}</td><td class="text-right">${fmtBRL(m.cost)}</td></tr>`).join('')}
            ${dre.costs.totalExternalProjects > 0 ? `<tr><td>📦 Custo externo</td><td colspan="2">Projetos pontuais</td><td class="text-right">${fmtBRL(dre.costs.totalExternalProjects)}</td></tr>` : ''}
            <tr style="font-weight:700; border-top:2px solid #ccc;"><td colspan="3">Total</td><td class="text-right">${fmtBRL(dre.costs.total)}</td></tr>
        </tbody>
    </table>
    <table>
        <thead><tr><th>Cliente</th><th class="text-right">Receita</th></tr></thead>
        <tbody>
            ${dre.revenue.perContract.map(c => `<tr><td>${c.client}</td><td class="text-right">${fmtBRL(c.value)}</td></tr>`).join('')}
            ${dre.revenue.perProject.map(p => `<tr><td>🚀 ${p.client}</td><td class="text-right">${fmtBRL(p.value)}</td></tr>`).join('')}
        </tbody>
    </table>
`).join('')}

<!-- ── CONTRATOS ── -->
<h2 class="section-break">3. Contratos Ativos</h2>
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
            const teamStr = roi.costBreakdown.map(b => `${b.name}`).join(', ') || '—';
            const mClass = roi.margin >= 40 ? 'badge-green' : roi.margin >= 15 ? 'badge-yellow' : 'badge-red';
            return `<tr>
                <td>${c.client}</td>
                <td>${squad ? (squad.icon || '') + ' ' + squad.name : '—'}</td>
                <td class="text-center">${c.videoCount || 0}</td>
                <td class="text-center">${c.staticCount || 0}</td>
                <td class="text-center">${c.trafficManagement ? '✓' : ''}</td>
                <td class="text-center">${c.founderBrand ? '✓' : ''}</td>
                <td style="font-size:8.5px;">${teamStr}</td>
                <td class="text-right">${fmtBRL(roi.revenue)}</td>
                <td class="text-right">${fmtBRL(roi.cost)}</td>
                <td class="text-center"><span class="badge ${mClass}">${roi.margin.toFixed(0)}%</span></td>
            </tr>`;
        }).join('')}
    </tbody>
</table>

${projects.length > 0 ? `
<!-- ── PROJETOS PONTUAIS ── -->
<h2>4. Projetos Pontuais (${periodLabel})</h2>
<table>
    <thead><tr><th>Projeto</th><th>Cliente</th><th>Squad</th><th class="text-right">Receita</th><th class="text-right">Custo Ext.</th><th class="text-center">Margem</th></tr></thead>
    <tbody>
        ${projects.map(p => {
            const roi = analyticsService.getProjectROI(p.id, periodId);
            const squad = p.squadId ? squadService.getSquad(p.squadId) : null;
            const mClass = roi.margin >= 40 ? 'badge-green' : roi.margin >= 15 ? 'badge-yellow' : 'badge-red';
            return `<tr>
                <td>${p.name}</td>
                <td>${p.client || '—'}</td>
                <td>${squad ? (squad.icon || '') + ' ' + squad.name : '—'}</td>
                <td class="text-right">${fmtBRL(roi.revenue)}</td>
                <td class="text-right">${fmtBRL(p.externalCost || 0)}</td>
                <td class="text-center"><span class="badge ${mClass}">${roi.margin.toFixed(0)}%</span></td>
            </tr>`;
        }).join('')}
    </tbody>
</table>
` : ''}

<!-- ── EQUIPE ── -->
<h2 ${projects.length > 0 ? '' : 'class="section-break"'}>
    ${projects.length > 0 ? '5' : '4'}. Equipe e Salários
</h2>
<table>
    <thead><tr><th>Nome</th><th>Cargo</th><th>Squad</th><th class="text-right">Salário</th><th class="text-right">Total Alocado</th><th class="text-center">Status</th></tr></thead>
    <tbody>
        ${people.map(p => {
            const salary = p.salary || 0;
            const totalAllocated = analyticsService.getPersonTotalAllocated(p.id, periodId);
            const squad = squads.find(s => s.headId === p.id || (s.members || []).includes(p.id));
            const diff = Math.abs(totalAllocated - salary);
            const statusClass = diff < 1 ? 'badge-green' : diff / Math.max(salary, 1) > 0.1 ? 'badge-red' : 'badge-yellow';
            const statusLabel = diff < 1 ? 'OK' : totalAllocated > salary ? 'Acima' : 'Abaixo';
            return `<tr>
                <td>${p.name}</td>
                <td>${p.role}</td>
                <td>${squad ? (squad.icon || '') + ' ' + squad.name : '—'}</td>
                <td class="text-right">${fmtBRL(salary)}</td>
                <td class="text-right">${fmtBRL(totalAllocated)}</td>
                <td class="text-center"><span class="badge ${statusClass}">${statusLabel}</span></td>
            </tr>`;
        }).join('')}
    </tbody>
</table>

<!-- ── CONFERÊNCIA SALARIAL ── -->
<h2>${projects.length > 0 ? '6' : '5'}. Conferência Salarial</h2>
<table>
    <thead><tr><th>Nome</th><th>Cargo</th><th class="text-right">Salário</th><th class="text-right">Alocado</th><th class="text-right">Diferença</th><th>Observação</th></tr></thead>
    <tbody>
        ${reconciliation.filter(r => Math.abs(r.allocated - r.salary) >= 1).map(r => {
            const diff = r.allocated - r.salary;
            const cls = diff > 0 ? 'kpi-red' : 'kpi-green';
            return `<tr>
                <td>${r.name}</td>
                <td>${r.role}</td>
                <td class="text-right">${fmtBRL(r.salary)}</td>
                <td class="text-right">${fmtBRL(r.allocated)}</td>
                <td class="text-right ${cls}">${diff > 0 ? '+' : ''}${fmtBRL(diff)}</td>
                <td style="font-size:8.5px;">${diff > 0 ? 'Custo alocado excede salário' : 'Capacidade não utilizada'}</td>
            </tr>`;
        }).join('') || '<tr><td colspan="6" class="text-center text-muted">Nenhuma divergência — todos os salários batem com o alocado</td></tr>'}
    </tbody>
</table>

<div class="footer">
    Fast Digital 360 — Relatório gerado automaticamente pelo Fast Analytics<br>
    Referência: ${periodLabel} | Gerado em: ${new Date().toLocaleString('pt-BR')}
</div>

</body>
</html>`;
}

function fmtBRL(value) {
    const n = Number(value);
    if (isNaN(n)) return 'R$ 0,00';
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
