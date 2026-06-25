// peoplePage.js - COM SISTEMA MENSAL + COPIAR MÊS ANTERIOR

import { renderPeriodSelector } from '../components/periodSelector.js';
import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';
import storage from '../store/storage.js';
import ROLES from '../utils/roles.js';

let currentEditId = null;

export function renderPeoplePage() {
    const contentEl = document.getElementById('content');

    const people = personService.getAllPeople();
    const currentPeriod = storage.getCurrentPeriod();

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Pessoas</h1>
            <p class="page-subtitle">Gerenciar equipe e colaboradores</p>
        </div>

        ${renderPeriodSelector()}

        <div class="action-bar">
            <div class="action-bar-left">
                <button class="btn btn-primary" onclick="window.openPersonModal()">
                    + Nova Pessoa
                </button>
                <button class="btn btn-secondary" onclick="window.openReajusteModal()">
                    🔁 Lançar Reajuste
                </button>
            </div>
            <div class="action-bar-right" style="font-size: 0.85rem; color: var(--text-secondary);">
                Período atual: <strong>${currentPeriod}</strong>
            </div>
        </div>

        <div id="people-list">
            ${renderPeopleList(people)}
        </div>

        <!-- ── MODAL: NOVA / EDITAR PESSOA ── -->
        <div id="person-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="modal-title">Nova Pessoa</h2>
                    <button class="modal-close" onclick="window.closePersonModal()">&times;</button>
                </div>
                <form id="person-form">
                    <div class="form-group">
                        <label class="form-label">Nome *</label>
                        <input type="text" class="form-input" id="name" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cargo *</label>
                        <select class="form-select" id="role" required>
                            <option value="">Selecione um cargo</option>
                            ${ROLES.map(role => `<option value="${role}">${role}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Salário Mensal (R$) *</label>
                        <input type="number" class="form-input" id="salary" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">% reservado para Founder Brand</label>
                        <input type="number" class="form-input" id="founder-brand-percent" step="1" min="0" max="100" value="0">
                        <p style="font-size:0.78rem; color:var(--text-secondary); margin-top:0.4rem;">
                            Só preencha se essa pessoa atua em contratos de Estratégia de Founder Brand. Essa % do salário fica reservada e dividida entre os clientes Founder Brand; o resto continua rateado normalmente.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="window.closePersonModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ── MODAL: LANÇAR REAJUSTE ── -->
        <div id="reajuste-modal" class="modal">
            <div class="modal-content" style="max-width: 520px;">
                <div class="modal-header">
                    <h2 class="modal-title">🔁 Lançar Reajuste</h2>
                    <button class="modal-close" onclick="window.closeReajusteModal()">&times;</button>
                </div>
                <div style="padding: 1.5rem;">
                    <div class="form-group">
                        <label class="form-label">Pessoa *</label>
                        <select class="form-select" id="reajuste-person" onchange="window.onReajustePersonChange()">
                            <option value="">Selecione...</option>
                            ${people.map(p => `<option value="${p.id}">${p.name} — ${p.role}</option>`).join('')}
                        </select>
                    </div>

                    <p id="reajuste-current-info" style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.75rem 0;"></p>

                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin: 0.75rem 0;">
                        <input type="checkbox" id="reajuste-inativo" onchange="window.onReajusteInativoChange()">
                        Marcar como inativo a partir deste mês (custo zerado)
                    </label>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">Novo salário (R$) *</label>
                            <input type="number" class="form-input" id="reajuste-salary" step="0.01" min="0">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label class="form-label">A partir de *</label>
                            <input type="month" class="form-input" id="reajuste-period" value="${currentPeriod}">
                        </div>
                    </div>

                    <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.75rem;">
                        Esse valor passa a valer a partir do mês escolhido — meses seguintes continuam com ele automaticamente, até o próximo reajuste.
                    </p>

                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="window.closeReajusteModal()">Cancelar</button>
                        <button class="btn btn-primary" onclick="window.saveReajuste()">💾 Salvar Reajuste</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── MODAL: BREAKDOWN DETALHADO ── -->
        <div id="person-breakdown-modal" class="modal">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2 class="modal-title" id="breakdown-title">Detalhamento de Custos</h2>
                    <button class="modal-close" onclick="window.closePersonBreakdownModal()">&times;</button>
                </div>
                <div id="breakdown-content" style="padding: 1.5rem;"></div>
            </div>
        </div>
    `;

    attachPeopleHandlers();
}

// ─── LISTA DE PESSOAS ─────────────────────────────────────────────────────────

function renderPeopleList(people) {
    if (people.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <h3>Nenhuma pessoa cadastrada</h3>
                <p>Comece adicionando membros da sua equipe</p>
            </div>
        `;
    }

    const peopleByRole = {};
    people.forEach(person => {
        if (!peopleByRole[person.role]) peopleByRole[person.role] = [];
        peopleByRole[person.role].push(person);
    });

    const sortedRoles = Object.keys(peopleByRole).sort();

    return sortedRoles.map(role => {
        const peopleInRole = peopleByRole[role];
        const currentPeriod = storage.getCurrentPeriod();
        const cols = '1.5fr 1.4fr 0.6fr 2.4fr 1.4fr 1.5fr auto';
        const headStyle = 'padding:1rem; background:var(--bg); border-bottom:2px solid var(--border); font-weight:bold; font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; white-space:nowrap;';
        const cellStyle = 'padding:1rem; border-bottom:1px solid var(--border); white-space:nowrap;';
        const wrapCellStyle = 'padding:1rem; border-bottom:1px solid var(--border);'; // Nome e Tipo de Entrega podem quebrar linha de propósito

        const headerCells = `
            <div style="${headStyle}">Nome</div>
            <div style="${headStyle}">Salário</div>
            <div style="${headStyle}">Contr.</div>
            <div style="${headStyle}">Tipo de Entrega</div>
            <div style="${headStyle}">Custo/Ent</div>
            <div style="${headStyle}">Ticket Médio</div>
            <div style="${headStyle}">Ações</div>
        `;

        const rowCells = peopleInRole.map(person => {
            const profile            = analyticsService.getPersonDeliveryProfile(person.id);
            const costPerDeliverable = analyticsService.getPersonCostPerDeliverable(person.id);
            const avgTicket          = analyticsService.getPersonAverageTicket(person.id);
            const periodSalary       = storage.getSalaryForPeriod(person.id, currentPeriod);

            let deliveryHtml;
            if (profile.kind === 'head') {
                deliveryHtml = `<strong>${profile.total}</strong> cliente${profile.total !== 1 ? 's' : ''} no squad`;
            } else if (profile.kind === 'head_master') {
                deliveryHtml = `<strong>${profile.total}</strong> cliente${profile.total !== 1 ? 's' : ''} (agência toda)`;
            } else if (profile.kind === 'traffic') {
                deliveryHtml = `<strong>${profile.total}</strong> contrato${profile.total !== 1 ? 's' : ''} de tráfego`;
            } else if (profile.total > 0 || profile.founderBrandClients > 0) {
                const parts = [];
                if (profile.video > 0)    parts.push(`Vídeo: <strong>${profile.video}</strong>`);
                if (profile.static > 0)   parts.push(`Estático: <strong>${profile.static}</strong>`);
                deliveryHtml = parts.length > 0
                    ? `${parts.join(' · ')} <span style="color:var(--text-secondary);">(${profile.total})</span>`
                    : '';
                if (profile.founderBrandClients > 0) {
                    deliveryHtml += `${deliveryHtml ? '<br>' : ''}🎤 <strong>${profile.founderBrandClients}</strong> Founder Brand`;
                }
            } else if (profile.fixedCount > 0) {
                deliveryHtml = `💰 <strong>${profile.fixedCount}</strong> fixo${profile.fixedCount !== 1 ? 's' : ''} sem entregável lançado`;
            } else {
                deliveryHtml = '<span class="text-muted" style="color:var(--text-secondary);">-</span>';
            }

            const contractCountDisplay = (profile.kind === 'head' || profile.kind === 'head_master') ? profile.total : profile.contractCount;

            return `
                <div style="${wrapCellStyle} font-weight: 500;">${person.name}</div>
                <div style="${cellStyle}">R$ ${formatCurrency(periodSalary)}</div>
                <div style="${cellStyle}">${contractCountDisplay}</div>
                <div style="${wrapCellStyle} font-size: 0.85rem; line-height: 1.5;">${deliveryHtml}</div>
                <div style="${cellStyle} color: var(--primary); font-weight: bold;">
                    ${costPerDeliverable > 0 ? `R$ ${formatCurrency(costPerDeliverable)}` : '-'}
                </div>
                <div style="${cellStyle} color: var(--success); font-weight: bold;">
                    ${avgTicket > 0 ? `R$ ${formatCurrency(avgTicket)}` : '-'}
                </div>
                <div style="${cellStyle} display: flex; gap: 0.5rem; align-items:center;">
                    <button class="btn btn-small btn-primary" onclick="window.showPersonBreakdown('${person.id}')" title="Ver Cálculo Detalhado">🔍</button>
                    <button class="btn btn-small btn-secondary" onclick="window.openReajusteModal('${person.id}')" title="Lançar Reajuste">🔁</button>
                    <button class="btn btn-small btn-secondary" onclick="window.editPerson('${person.id}')" title="Editar">✏️</button>
                    <button class="btn btn-small btn-danger" onclick="window.deletePerson('${person.id}')" title="Excluir">🗑️</button>
                </div>
            `;
        }).join('');

        return `
            <div style="margin-bottom: 3rem;">
                <h3 style="color: var(--primary); margin-bottom: 1rem; font-size: 1.3rem; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${role}
                </h3>

                <div style="display: grid; grid-template-columns: ${cols}; column-gap: 1rem; align-items: center; background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                    ${headerCells}
                    ${rowCells}
                </div>
            </div>
        `;
    }).join('');
}

// ─── MODAL: LANÇAR REAJUSTE ──────────────────────────────────────────────────

function openReajusteModal(personId = null) {
    document.getElementById('reajuste-modal').classList.add('active');
    document.getElementById('reajuste-person').value = personId || '';
    document.getElementById('reajuste-period').value = storage.getCurrentPeriod();
    document.getElementById('reajuste-inativo').checked = false;
    document.getElementById('reajuste-salary').disabled = false;
    onReajustePersonChange();
}

function closeReajusteModal() {
    document.getElementById('reajuste-modal').classList.remove('active');
}

function onReajustePersonChange() {
    const personId = document.getElementById('reajuste-person').value;
    const infoEl   = document.getElementById('reajuste-current-info');
    const salaryInput = document.getElementById('reajuste-salary');

    if (!personId) {
        infoEl.textContent = '';
        salaryInput.value = '';
        return;
    }

    const currentPeriod = storage.getCurrentPeriod();
    const current = storage.getSalaryForPeriod(personId, currentPeriod);
    infoEl.textContent = `Salário vigente hoje: R$ ${formatCurrency(current)}`;
    salaryInput.value = current;
}

function onReajusteInativoChange() {
    const inativo = document.getElementById('reajuste-inativo').checked;
    const salaryInput = document.getElementById('reajuste-salary');
    salaryInput.disabled = inativo;
    if (inativo) salaryInput.value = 0;
}

function saveReajuste() {
    const personId  = document.getElementById('reajuste-person').value;
    const period     = document.getElementById('reajuste-period').value;
    const inativo    = document.getElementById('reajuste-inativo').checked;
    const salary     = inativo ? 0 : parseFloat(document.getElementById('reajuste-salary').value);

    if (!personId) { alert('Selecione uma pessoa.'); return; }
    if (!period)   { alert('Selecione o mês de vigência.'); return; }
    if (!inativo && (isNaN(salary) || salary < 0)) { alert('Informe um salário válido.'); return; }

    storage.setSalaryForPeriod(personId, period, salary, inativo ? 'inactive' : 'active');
    closeReajusteModal();

    const person = personService.getPerson(personId);
    const msg = inativo
        ? `✅ ${person.name} marcado como inativo a partir de ${period}`
        : `✅ Novo salário de ${person.name} (R$ ${formatCurrency(salary)}) vigente a partir de ${period}`;

    if (typeof window.showToast === 'function') window.showToast(msg);
    else alert(msg);

    renderPeoplePage();
}

// ─── BREAKDOWN DETALHADO DA PESSOA ───────────────────────────────────────────

function showPersonBreakdown(personId) {
    const person          = personService.getPerson(personId);
    const currentPeriod   = storage.getCurrentPeriod();
    const contracts       = analyticsService.getPersonContracts(personId);
    const totalRateable   = analyticsService.getPersonTotalRateableDeliverables(personId, currentPeriod);
    const effectiveSalary = analyticsService.getPersonCost(personId, currentPeriod);
    const costPerDeliverable = analyticsService.getPersonCostPerDeliverable(personId, currentPeriod);

    document.getElementById('breakdown-title').textContent = `${person.name} - Detalhamento de Custos`;

    const infoHtml = `
        <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; color: var(--fast-green); font-size: 1rem; text-transform: uppercase;">💼 Informações Gerais</h3>
            <div style="display: grid; gap: 0.5rem;">
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>Cargo:</span>
                    <strong>${person.role}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>Salário (${currentPeriod}):</span>
                    <strong>R$ ${formatCurrency(effectiveSalary)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>Contratos Ativos:</span>
                    <strong>${contracts.length}</strong>
                </div>
            </div>
        </div>
    `;

    let contractsHtml = '';
    if (contracts.length > 0) {
        contractsHtml = `
            <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; color: var(--fast-green); font-size: 1rem; text-transform: uppercase;">📊 Distribuição por Contrato</h3>
                ${contracts.map(contract => {
                    const b = analyticsService.getPersonContractBreakdown(personId, contract.id, currentPeriod);
                    if (!b) return '';

                    if (b.mode === 'fixo') {
                        return `
                            <div style="background: var(--bg); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <strong style="color: var(--fast-green);">${b.client}</strong>
                                    <span style="color: var(--fast-green); font-weight: bold;">R$ ${formatCurrency(b.cost)}</span>
                                </div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                    └─ <strong style="color: var(--text-primary);">Valor fixo travado</strong> — não entra no rateio do salário
                                </div>
                            </div>
                        `;
                    }

                    if (b.relevantQuantity === 0) return '';

                    return `
                        <div style="background: var(--bg); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <strong style="color: var(--fast-green);">${b.client}</strong>
                                <span style="color: var(--fast-green); font-weight: bold;">R$ ${formatCurrency(b.cost)}</span>
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                                ${b.videoCount > 0  ? `├─ ${b.videoCount} vídeo(s)<br>` : ''}
                                ${b.staticCount > 0 ? `├─ ${b.staticCount} estático(s)<br>` : ''}
                                └─ <strong style="color: var(--text-primary);">RATEIO: ${b.relevantQuantity} entrega(s) relevante(s) ÷ ${totalRateable} totais × R$ ${formatCurrency(effectiveSalary)} = R$ ${formatCurrency(b.cost)}</strong>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    const reconciliation = analyticsService.getSalaryReconciliation(currentPeriod).find(r => r.personId === personId);
    const isValid = reconciliation ? reconciliation.isOk : true;

    const summaryHtml = `
        <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; border: 2px solid var(--fast-green);">
            <h3 style="color: var(--fast-green); margin: 0 0 1rem 0; font-size: 1rem; text-transform: uppercase;">✅ Resumo do Cálculo</h3>
            <div style="display: grid; gap: 0.75rem;">
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>📦 Total de Entregas Rateáveis (todos contratos):</span>
                    <strong>${totalRateable} entrega(s)</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>💰 Custo por Entrega:</span>
                    <strong>R$ ${formatCurrency(effectiveSalary)} ÷ ${totalRateable} = R$ ${formatCurrency(costPerDeliverable)}/entrega</strong>
                </div>
                <div style="text-align: center; padding: 0.75rem; background: var(${isValid ? '--success' : '--error'}); color: white; border-radius: 4px; font-weight: bold;">
                    ${isValid ? '✓ Cálculo correto! O rateio bate com o salário.' : '⚠️ Diferença detectada! Verifique as alocações deste contrato.'}
                </div>
            </div>
        </div>
    `;

    document.getElementById('breakdown-content').innerHTML = infoHtml + contractsHtml + summaryHtml;
    document.getElementById('person-breakdown-modal').classList.add('active');
}

function closePersonBreakdownModal() {
    document.getElementById('person-breakdown-modal').classList.remove('active');
}

// ─── HANDLERS ────────────────────────────────────────────────────────────────

function attachPeopleHandlers() {
    document.getElementById('person-form').addEventListener('submit', handlePersonSubmit);

    window.openPersonModal           = openPersonModal;
    window.closePersonModal          = closePersonModal;
    window.editPerson                = editPerson;
    window.deletePerson              = deletePerson;
    window.showPersonBreakdown       = showPersonBreakdown;
    window.closePersonBreakdownModal = closePersonBreakdownModal;
    window.openReajusteModal         = openReajusteModal;
    window.closeReajusteModal        = closeReajusteModal;
    window.onReajustePersonChange    = onReajustePersonChange;
    window.onReajusteInativoChange   = onReajusteInativoChange;
    window.saveReajuste              = saveReajuste;
}

function openPersonModal() {
    currentEditId = null;
    document.getElementById('person-modal').classList.add('active');
    document.getElementById('modal-title').textContent = 'Nova Pessoa';
    document.getElementById('person-form').reset();
    document.getElementById('founder-brand-percent').value = 0;
}

function closePersonModal() {
    document.getElementById('person-modal').classList.remove('active');
    currentEditId = null;
}

function editPerson(id) {
    currentEditId = id;
    const person = personService.getPerson(id);

    document.getElementById('name').value   = person.name;
    document.getElementById('role').value   = person.role;
    document.getElementById('salary').value = person.salary;
    document.getElementById('founder-brand-percent').value = person.founderBrandPercent || 0;

    document.getElementById('modal-title').textContent = 'Editar Pessoa';
    document.getElementById('person-modal').classList.add('active');
}

function handlePersonSubmit(e) {
    e.preventDefault();

    const formData = {
        name:   document.getElementById('name').value,
        role:   document.getElementById('role').value,
        salary: parseFloat(document.getElementById('salary').value),
        founderBrandPercent: parseFloat(document.getElementById('founder-brand-percent').value) || 0
    };

    try {
        if (currentEditId) {
            personService.updatePerson(currentEditId, formData);
            // Sincronizar salary_history do período atual
            const currentPeriod = storage.getCurrentPeriod();
            storage.setSalaryForPeriod(currentEditId, currentPeriod, formData.salary, 'active');
        } else {
            const newPerson = personService.createPerson(formData);
            // Criar entrada inicial no salary_history
            if (newPerson) {
                const currentPeriod = storage.getCurrentPeriod();
                storage.setSalaryForPeriod(newPerson.id, currentPeriod, formData.salary, 'active');
            }
        }
        closePersonModal();
        renderPeoplePage();
    } catch (error) {
        alert(error.message);
    }
}

function deletePerson(id) {
    if (confirm('Tem certeza que deseja excluir esta pessoa?')) {
        try {
            personService.deletePerson(id);
            renderPeoplePage();
        } catch (error) {
            alert(error.message);
        }
    }
}

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

function formatCurrency(value) {
    return (value || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
