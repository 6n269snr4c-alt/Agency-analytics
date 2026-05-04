// projectsPage.js - Página de Projetos Pontuais
// Projetos one-off atribuídos a squads, com receita somada aos contratos recorrentes.

import { renderPeriodSelector } from '../components/periodSelector.js';
import projectService from '../services/projectService.js';
import squadService from '../services/squadService.js';
import storage from '../store/storage.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(value) {
    const n = Number(value);
    if (isNaN(n)) return '0,00';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function periodLabel(periodId) {
    if (!periodId) return '—';
    const [y, m] = periodId.split('-');
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${months[parseInt(m, 10) - 1]}/${y}`;
}

function statusBadge(status) {
    const map = {
        em_andamento: { label: 'Em Andamento', cls: 'badge-info' },
        concluido:    { label: 'Concluído',    cls: 'badge-success' },
        cancelado:    { label: 'Cancelado',    cls: 'badge-error' },
    };
    const s = map[status] || { label: status, cls: '' };
    return `<span class="badge ${s.cls}" style="font-size:0.75rem;">${s.label}</span>`;
}

function marginClass(margin) {
    if (margin >= 30) return 'color: var(--fast-green, #7cfc00)';
    if (margin >= 15) return 'color: var(--warning, #ffb300)';
    return 'color: var(--error, #f44336)';
}

// Gera lista de períodos YYYY-MM para os próximos/anteriores N meses
function generatePeriodOptions(centered, range = 12) {
    const options = [];
    const [y, m] = centered.split('-').map(Number);
    for (let i = -range; i <= range; i++) {
        let month = m + i;
        let year  = y;
        while (month > 12) { month -= 12; year++; }
        while (month < 1)  { month += 12; year--; }
        const id = `${year}-${String(month).padStart(2,'0')}`;
        options.push(id);
    }
    return options;
}

// ─── entry point ─────────────────────────────────────────────────────────────

export function renderProjectsPage() {
    const contentEl = document.getElementById('content');
    const currentPeriod = storage.getCurrentPeriod();
    const allProjects   = projectService.getAllProjects();
    const squads        = squadService.getAllSquads();

    // ── Totais do período ──
    const periodProjects = projectService.getProjectsForPeriod(currentPeriod);
    const periodRevenue  = periodProjects.reduce((s, p) => s + (p.value || 0), 0);
    const periodExtCost  = periodProjects.reduce((s, p) => s + (p.externalCost || 0), 0);
    const periodProfit   = periodRevenue - periodExtCost;
    const periodMargin   = periodRevenue > 0 ? (periodProfit / periodRevenue) * 100 : 0;

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">⚡ Projetos Pontuais</h1>
            <p class="page-subtitle">Projetos one-off com faturamento após entrega — receita somada ao período de cobrança</p>
        </div>

        ${renderPeriodSelector()}

        <!-- Cards de resumo do período -->
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:1.5rem; margin-bottom:2rem;">
            <div class="stat-card">
                <div class="stat-value" style="color:var(--fast-green,#7cfc00)">R$ ${fmt(periodRevenue)}</div>
                <div class="stat-label">Receita Pontual (mês)</div>
                <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.25rem;">${periodProjects.length} projeto(s) faturando</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:var(--error,#f44336)">R$ ${fmt(periodExtCost)}</div>
                <div class="stat-label">Custo Externo (mês)</div>
                <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.25rem;">freelancers e terceiros</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="${marginClass(periodMargin)}">R$ ${fmt(periodProfit)}</div>
                <div class="stat-label">Lucro Pontual (mês)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="${marginClass(periodMargin)}">${periodMargin.toFixed(1)}%</div>
                <div class="stat-label">Margem (projetos)</div>
            </div>
        </div>

        <!-- Action bar -->
        <div class="action-bar" style="margin-bottom:1.5rem;">
            <div class="action-bar-left">
                <button class="btn btn-primary" onclick="window.openProjectModal()">+ Novo Projeto</button>
            </div>
            <div class="action-bar-right" style="display:flex;gap:0.75rem;align-items:center;">
                <span style="font-size:0.85rem;color:var(--text-secondary);">Total: ${allProjects.length} projeto(s)</span>
            </div>
        </div>

        <!-- Lista de projetos -->
        <div id="projects-list">
            ${renderProjectsList(allProjects, squads)}
        </div>

        <!-- Modal -->
        <div id="project-modal" class="modal" style="display:none;">
            <div class="modal-content" style="max-width:680px;">
                <div class="modal-header">
                    <h2 class="modal-title" id="project-modal-title">Novo Projeto Pontual</h2>
                    <button class="modal-close" onclick="window.closeProjectModal()">&times;</button>
                </div>
                <div id="project-modal-body">
                    ${renderProjectForm(null, squads, storage.getCurrentPeriod())}
                </div>
            </div>
        </div>

        <style>${projectStyles()}</style>
    `;

    attachHandlers(squads);
}

// ─── Lista de projetos ────────────────────────────────────────────────────────

function renderProjectsList(projects, squads) {
    if (projects.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">🚀</div>
                <h3>Nenhum projeto pontual cadastrado</h3>
                <p>Projetos pontuais são trabalhos one-off (sites, identidade visual, campanhas especiais, etc.)<br>
                   A receita é contabilizada no período de faturamento escolhido.</p>
            </div>
        `;
    }

    // Ordenar: em_andamento primeiro, depois por data de entrega
    const sorted = [...projects].sort((a, b) => {
        const order = { em_andamento: 0, concluido: 1, cancelado: 2 };
        const diff = (order[a.status] || 0) - (order[b.status] || 0);
        if (diff !== 0) return diff;
        if (a.deliveryDate && b.deliveryDate) return a.deliveryDate.localeCompare(b.deliveryDate);
        return 0;
    });

    return sorted.map(p => renderProjectCard(p, squads)).join('');
}

function renderProjectCard(p, squads) {
    const squad     = squads.find(s => s.id === p.squadId);
    const profit    = (p.value || 0) - (p.externalCost || 0);
    const margin    = (p.value || 0) > 0 ? (profit / p.value) * 100 : 0;
    const extCost   = p.externalCost || 0;

    const deliverableTypes   = storage.getDeliverableTypes();
    const deliverableEntries = Object.entries(p.deliverables || {});
    const customEntries      = (p.customDeliverables || []).filter(c => c.label);

    return `
        <div class="list-item project-card" data-id="${p.id}" style="margin-bottom:1rem;">
            <div class="list-item-header" style="align-items:flex-start;">
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
                        <span class="list-item-title" style="font-size:1.1rem;">${p.name}</span>
                        ${statusBadge(p.status)}
                        ${squad ? `<span class="badge" style="background:rgba(255,255,255,0.08);color:var(--text-secondary);font-size:0.75rem;">${squad.icon || '🏢'} ${squad.name}</span>` : '<span class="badge" style="background:rgba(255,100,0,0.15);color:#ff9800;font-size:0.75rem;">⚠️ Sem squad</span>'}
                    </div>
                    ${p.client ? `<div style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.25rem;">👤 ${p.client}</div>` : ''}
                    ${p.description ? `<div style="font-size:0.83rem;color:var(--text-secondary);margin-top:0.25rem;">${p.description}</div>` : ''}
                </div>
                <div class="list-item-actions">
                    <button class="btn btn-small btn-secondary" onclick="window.editProject('${p.id}')">✏️ Editar</button>
                    <button class="btn btn-small btn-danger"    onclick="window.deleteProject('${p.id}')">🗑️</button>
                </div>
            </div>

            <!-- Grid financeiro + datas -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);">
                <div class="project-metric">
                    <span class="project-metric-label">💵 Valor do Projeto</span>
                    <span class="project-metric-value" style="color:var(--fast-green,#7cfc00)">R$ ${fmt(p.value)}</span>
                </div>
                ${extCost > 0 ? `
                <div class="project-metric">
                    <span class="project-metric-label">💸 Custo Externo</span>
                    <span class="project-metric-value" style="color:var(--error,#f44336)">R$ ${fmt(extCost)}</span>
                    ${p.externalCostNote ? `<span style="font-size:0.75rem;color:var(--text-secondary);">${p.externalCostNote}</span>` : ''}
                </div>
                ` : ''}
                <div class="project-metric">
                    <span class="project-metric-label">📈 Margem</span>
                    <span class="project-metric-value" style="${marginClass(margin)}">${margin.toFixed(1)}%</span>
                </div>
                <div class="project-metric">
                    <span class="project-metric-label">📅 Entrega prevista</span>
                    <span class="project-metric-value">${formatDate(p.deliveryDate)}</span>
                </div>
                <div class="project-metric">
                    <span class="project-metric-label">🗓️ Fatura no período</span>
                    <span class="project-metric-value" style="color:var(--primary,#7cfc00)">${periodLabel(p.billingPeriod)}</span>
                </div>
            </div>

            <!-- Entregáveis -->
            ${(deliverableEntries.length > 0 || customEntries.length > 0) ? `
            <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);">
                <span style="font-size:0.8rem;color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Entregáveis</span>
                <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.5rem;">
                    ${deliverableEntries.map(([typeId, qty]) => {
                        const dt = deliverableTypes.find(t => t.id === typeId);
                        return `<span style="background:rgba(255,255,255,0.06);border:1px solid var(--border);padding:0.25rem 0.6rem;border-radius:6px;font-size:0.8rem;">${dt ? dt.name : typeId} <strong>${qty}×</strong></span>`;
                    }).join('')}
                    ${customEntries.map(c => `
                        <span style="background:rgba(255,160,0,0.1);border:1px solid rgba(255,160,0,0.3);padding:0.25rem 0.6rem;border-radius:6px;font-size:0.8rem;">✏️ ${c.label} <strong>${c.qty || 1}×</strong></span>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${p.notes ? `<div style="margin-top:0.75rem;font-size:0.83rem;color:var(--text-secondary);font-style:italic;">📝 ${p.notes}</div>` : ''}
        </div>
    `;
}

// ─── Formulário do modal ──────────────────────────────────────────────────────

function renderProjectForm(project, squads, currentPeriod) {
    const deliverableTypes = storage.getDeliverableTypes();
    const periods          = generatePeriodOptions(currentPeriod, 18);
    const existingDelivs   = project?.deliverables || {};
    const customDelivs     = project?.customDeliverables || [{ label: '', qty: 1 }];

    return `
        <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1.25rem;">

            <!-- Nome + Cliente -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group" style="margin:0;">
                    <label class="form-label">Nome do Projeto *</label>
                    <input type="text" class="form-input" id="proj-name" placeholder="Ex: Site institucional XYZ" value="${project?.name || ''}">
                </div>
                <div class="form-group" style="margin:0;">
                    <label class="form-label">Cliente</label>
                    <input type="text" class="form-input" id="proj-client" placeholder="Nome do cliente" value="${project?.client || ''}">
                </div>
            </div>

            <!-- Squad + Status -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group" style="margin:0;">
                    <label class="form-label">Squad responsável</label>
                    <select class="form-input" id="proj-squad">
                        <option value="">— Sem squad —</option>
                        ${squads.map(s => `<option value="${s.id}" ${project?.squadId === s.id ? 'selected' : ''}>${s.icon || '🏢'} ${s.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="margin:0;">
                    <label class="form-label">Status</label>
                    <select class="form-input" id="proj-status">
                        <option value="em_andamento" ${(project?.status || 'em_andamento') === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                        <option value="concluido"    ${project?.status === 'concluido'    ? 'selected' : ''}>Concluído</option>
                        <option value="cancelado"    ${project?.status === 'cancelado'    ? 'selected' : ''}>Cancelado</option>
                    </select>
                </div>
            </div>

            <!-- Descrição -->
            <div class="form-group" style="margin:0;">
                <label class="form-label">Descrição</label>
                <input type="text" class="form-input" id="proj-description" placeholder="Breve descrição do projeto" value="${project?.description || ''}">
            </div>

            <!-- Financeiro -->
            <div style="background:var(--bg-darker);border:1px solid var(--border);border-radius:8px;padding:1rem;">
                <div style="font-size:0.85rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:1rem;">💰 Financeiro</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">Valor do Projeto (R$) *</label>
                        <input type="number" class="form-input" id="proj-value" placeholder="0,00" min="0" step="0.01" value="${project?.value || ''}">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">Custo Externo (R$)</label>
                        <input type="number" class="form-input" id="proj-external-cost" placeholder="0,00" min="0" step="0.01" value="${project?.externalCost || ''}">
                        <small style="color:var(--text-secondary);font-size:0.78rem;">Freelancer, fornecedor, etc.</small>
                    </div>
                </div>
                <div class="form-group" style="margin-top:0.75rem;margin-bottom:0;">
                    <label class="form-label">Nota sobre custo externo</label>
                    <input type="text" class="form-input" id="proj-external-note" placeholder="Ex: Freelancer de motion, impressão gráfica" value="${project?.externalCostNote || ''}">
                </div>
            </div>

            <!-- Datas -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
                <div class="form-group" style="margin:0;">
                    <label class="form-label">Início</label>
                    <input type="date" class="form-input" id="proj-start" value="${project?.startDate || ''}">
                </div>
                <div class="form-group" style="margin:0;">
                    <label class="form-label">Entrega Prevista</label>
                    <input type="date" class="form-input" id="proj-delivery" value="${project?.deliveryDate || ''}">
                </div>
                <div class="form-group" style="margin:0;">
                    <label class="form-label">Fatura no período *</label>
                    <select class="form-input" id="proj-billing-period">
                        <option value="">— Selecionar —</option>
                        ${periods.map(pid => `<option value="${pid}" ${project?.billingPeriod === pid ? 'selected' : (pid === currentPeriod && !project ? 'selected' : '')}>${periodLabel(pid)}</option>`).join('')}
                    </select>
                    <small style="color:var(--text-secondary);font-size:0.78rem;">Mês em que entra na receita</small>
                </div>
            </div>

            <!-- Entregáveis padrão -->
            ${deliverableTypes.length > 0 ? `
            <div style="background:var(--bg-darker);border:1px solid var(--border);border-radius:8px;padding:1rem;">
                <div style="font-size:0.85rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:1rem;">📦 Entregáveis do Escopo</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem;">
                    ${deliverableTypes.map(dt => `
                        <div style="display:flex;align-items:center;gap:0.5rem;">
                            <label style="flex:1;font-size:0.88rem;">${dt.name}</label>
                            <input type="number" class="form-input deliverable-qty" data-type-id="${dt.id}"
                                   style="width:70px;text-align:center;"
                                   min="0" step="1"
                                   value="${existingDelivs[dt.id] || 0}"
                                   placeholder="0">
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Entregáveis customizados -->
            <div style="background:var(--bg-darker);border:1px solid rgba(255,160,0,0.2);border-radius:8px;padding:1rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                    <div style="font-size:0.85rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">✏️ Entregáveis Customizados</div>
                    <button type="button" class="btn btn-small btn-secondary" onclick="window.addCustomDeliverable()">+ Adicionar</button>
                </div>
                <div id="custom-deliverables-list" style="display:flex;flex-direction:column;gap:0.5rem;">
                    ${customDelivs.map((c, i) => renderCustomDeliverableRow(c, i)).join('')}
                </div>
                <small style="color:var(--text-secondary);font-size:0.78rem;margin-top:0.5rem;display:block;">Para entregas específicas deste projeto que não estão na lista padrão</small>
            </div>

            <!-- Observações -->
            <div class="form-group" style="margin:0;">
                <label class="form-label">Observações</label>
                <textarea class="form-textarea" id="proj-notes" placeholder="Informações adicionais sobre o projeto..." style="min-height:80px;">${project?.notes || ''}</textarea>
            </div>

            <!-- Botões -->
            <div class="modal-footer" style="padding:0;margin-top:0.5rem;">
                <button type="button" class="btn btn-secondary" onclick="window.closeProjectModal()">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="window.saveProject()">💾 Salvar Projeto</button>
            </div>
        </div>
    `;
}

function renderCustomDeliverableRow(c, index) {
    return `
        <div class="custom-deliv-row" data-index="${index}" style="display:flex;gap:0.5rem;align-items:center;">
            <input type="text" class="form-input custom-deliv-label" placeholder="Nome do entregável (ex: Naming, Manual de Marca)" value="${c.label || ''}" style="flex:1;">
            <input type="number" class="form-input custom-deliv-qty" min="1" step="1" value="${c.qty || 1}" style="width:70px;text-align:center;" placeholder="Qtd">
            <button type="button" class="btn btn-small btn-danger" onclick="window.removeCustomDeliverable(${index})">✕</button>
        </div>
    `;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function attachHandlers(squads) {
    let editingId = null;

    window.openProjectModal = function(id = null) {
        editingId = id;
        const project  = id ? projectService.getProjectById(id) : null;
        const currentPeriod = storage.getCurrentPeriod();
        document.getElementById('project-modal-title').textContent = id ? 'Editar Projeto' : 'Novo Projeto Pontual';
        document.getElementById('project-modal-body').innerHTML = renderProjectForm(project, squads, currentPeriod);
        document.getElementById('project-modal').style.display = 'flex';
    };

    window.closeProjectModal = function() {
        document.getElementById('project-modal').style.display = 'none';
        editingId = null;
    };

    window.editProject = function(id) {
        window.openProjectModal(id);
    };

    window.deleteProject = function(id) {
        const p = projectService.getProjectById(id);
        if (!p) return;
        if (!confirm(`Excluir projeto "${p.name}"? Esta ação não pode ser desfeita.`)) return;
        projectService.deleteProject(id);
        renderProjectsPage();
    };

    window.addCustomDeliverable = function() {
        const list    = document.getElementById('custom-deliverables-list');
        const rows    = list.querySelectorAll('.custom-deliv-row');
        const newIdx  = rows.length;
        const div     = document.createElement('div');
        div.innerHTML = renderCustomDeliverableRow({ label: '', qty: 1 }, newIdx);
        list.appendChild(div.firstElementChild);
    };

    window.removeCustomDeliverable = function(index) {
        const list = document.getElementById('custom-deliverables-list');
        const rows = list.querySelectorAll('.custom-deliv-row');
        if (rows[index]) rows[index].remove();
        // Re-index
        list.querySelectorAll('.custom-deliv-row').forEach((row, i) => {
            row.dataset.index = i;
            row.querySelector('.btn-danger').setAttribute('onclick', `window.removeCustomDeliverable(${i})`);
        });
    };

    window.saveProject = function() {
        try {
            const name           = document.getElementById('proj-name').value.trim();
            const client         = document.getElementById('proj-client').value.trim();
            const squadId        = document.getElementById('proj-squad').value;
            const status         = document.getElementById('proj-status').value;
            const description    = document.getElementById('proj-description').value.trim();
            const value          = parseFloat(document.getElementById('proj-value').value) || 0;
            const externalCost   = parseFloat(document.getElementById('proj-external-cost').value) || 0;
            const externalCostNote = document.getElementById('proj-external-note').value.trim();
            const startDate      = document.getElementById('proj-start').value || null;
            const deliveryDate   = document.getElementById('proj-delivery').value || null;
            const billingPeriod  = document.getElementById('proj-billing-period').value || null;
            const notes          = document.getElementById('proj-notes').value.trim();

            // Entregáveis padrão
            const deliverables = {};
            document.querySelectorAll('.deliverable-qty').forEach(input => {
                const qty = parseInt(input.value, 10);
                if (qty > 0) deliverables[input.dataset.typeId] = qty;
            });

            // Entregáveis customizados
            const customDeliverables = [];
            document.querySelectorAll('.custom-deliv-row').forEach(row => {
                const label = row.querySelector('.custom-deliv-label').value.trim();
                const qty   = parseInt(row.querySelector('.custom-deliv-qty').value, 10) || 1;
                if (label) customDeliverables.push({ label, qty });
            });

            const data = {
                name, client, squadId: squadId || null, status, description,
                value, externalCost, externalCostNote,
                deliverables, customDeliverables,
                startDate, deliveryDate, billingPeriod, notes,
            };

            if (editingId) {
                projectService.updateProject(editingId, data);
            } else {
                projectService.createProject(data);
            }

            window.closeProjectModal();
            renderProjectsPage();

        } catch (err) {
            alert('Erro ao salvar: ' + err.message);
        }
    };

    // Fechar modal clicando no backdrop
    document.getElementById('project-modal').addEventListener('click', function(e) {
        if (e.target === this) window.closeProjectModal();
    });
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

function projectStyles() {
    return `
        .project-card {
            transition: border-color 0.2s;
        }
        .project-card:hover {
            border-color: rgba(124,252,0,0.3);
        }
        .project-metric {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
        }
        .project-metric-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .project-metric-value {
            font-size: 1.05rem;
            font-weight: 700;
        }
        #project-modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 1000;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        #project-modal .modal-content {
            background: var(--bg-card, #1a1a1a);
            border: 1px solid var(--border);
            border-radius: 12px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
        }
    `;
}
