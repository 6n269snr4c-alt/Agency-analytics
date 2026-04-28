// peoplePage.js - COM SISTEMA MENSAL + COPIAR MÊS ANTERIOR

import { renderPeriodSelector } from '../components/periodSelector.js';
import personService from '../services/personService.js';
import analyticsService from '../services/analyticsService.js';
import deliverableTypeService from '../services/deliverableTypeService.js';
import storage from '../store/storage.js';
import ROLES from '../utils/roles.js';

let currentEditId = null;

export function renderPeoplePage() {
    const contentEl = document.getElementById('content');

    const people = personService.getAllPeople();
    const currentPeriod = storage.getCurrentPeriod();

    // Calcular período anterior
    const [year, month] = currentPeriod.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    const currentSalaries   = storage.getSalariesForPeriod(currentPeriod);
    const previousSalaries  = storage.getSalariesForPeriod(previousPeriod);
    const hasPreviousSalaries = previousSalaries.length > 0;
    const hasCurrentSalaries  = currentSalaries.length > 0;

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
                <button
                    class="btn btn-secondary"
                    onclick="window.openCopyMonthModal()"
                    ${!hasPreviousSalaries ? 'disabled title="Sem dados no mês anterior"' : ''}
                    style="${!hasPreviousSalaries ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                >
                    📅 Copiar Mês Anterior
                </button>
            </div>
            <div class="action-bar-right" style="font-size: 0.85rem; color: var(--text-secondary);">
                Período atual: <strong>${currentPeriod}</strong>
                ${hasCurrentSalaries
                    ? `<span style="color: var(--success); margin-left: 0.5rem;">● ${currentSalaries.length} salários carregados</span>`
                    : `<span style="color: var(--warning); margin-left: 0.5rem;">⚠ Sem salários neste período</span>`
                }
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
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="window.closePersonModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ── MODAL: COPIAR MÊS ANTERIOR ── -->
        <div id="copy-month-modal" class="modal">
            <div class="modal-content" style="max-width: 720px;">
                <div class="modal-header">
                    <h2 class="modal-title">📅 Copiar Salários — ${previousPeriod} → ${currentPeriod}</h2>
                    <button class="modal-close" onclick="window.closeCopyMonthModal()">&times;</button>
                </div>
                <div style="padding: 1.5rem;">
                    <p style="color: var(--text-secondary); margin: 0 0 1.5rem 0; font-size: 0.9rem;">
                        Salários de <strong>${previousPeriod}</strong> carregados abaixo.
                        Ajuste valores, marque demissões ou deixe como está e clique em <strong>Aplicar</strong>.
                    </p>

                    <div id="copy-month-list" style="display: grid; gap: 0.75rem; max-height: 420px; overflow-y: auto; padding-right: 0.5rem;">
                        ${renderCopyMonthList(people, previousPeriod)}
                    </div>

                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 1rem; align-items: center;">
                        <span id="copy-month-summary" style="color: var(--text-secondary); font-size: 0.85rem;"></span>
                        <button class="btn btn-secondary" onclick="window.closeCopyMonthModal()">Cancelar</button>
                        <button class="btn btn-primary" onclick="window.applyCopyMonth()">✅ Aplicar ao Período Atual</button>
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

        return `
            <div style="margin-bottom: 3rem;">
                <h3 style="color: var(--primary); margin-bottom: 1rem; font-size: 1.3rem; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${role}
                </h3>

                <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                    <div style="display: grid; grid-template-columns: 2fr 1.2fr 0.8fr 0.8fr 2fr 1.2fr 1.3fr auto; gap: 1rem; padding: 1rem; background: var(--bg); border-bottom: 2px solid var(--border); font-weight: bold; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase;">
                        <div>Nome</div>
                        <div>Salário</div>
                        <div>Contr.</div>
                        <div>Entreg.</div>
                        <div>Tipo de Entrega</div>
                        <div>Custo/Ent</div>
                        <div>Ticket Médio</div>
                        <div>Ações</div>
                    </div>

                    ${peopleInRole.map(person => {
                        const contracts          = analyticsService.getPersonContracts(person.id);
                        const totalDeliverables  = analyticsService.getPersonTotalDeliverables(person.id);
                        const costPerDeliverable = analyticsService.getPersonCostPerDeliverable(person.id);
                        const avgTicket          = analyticsService.getPersonAverageTicket(person.id);
                        const breakdown          = analyticsService.getPersonDeliverablesBreakdown(person.id);

                        const currentPeriod = storage.getCurrentPeriod();
                        const periodSalary  = storage.getSalaryForPeriod(person.id, currentPeriod);
                        const displaySalary = periodSalary !== null ? periodSalary : person.salary;

                        return `
                            <div style="display: grid; grid-template-columns: 2fr 1.2fr 0.8fr 0.8fr 2fr 1.2fr 1.3fr auto; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--border); align-items: center;">
                                <div style="font-weight: 500;">${person.name}</div>
                                <div>
                                    R$ ${formatCurrency(displaySalary)}
                                    ${periodSalary === null
                                        ? '<span title="Salário base — sem histórico neste período" style="color:var(--warning); font-size:0.75rem;"> ⚠</span>'
                                        : ''}
                                </div>
                                <div>${contracts.length}</div>
                                <div>${totalDeliverables}</div>
                                <div style="font-size: 0.85rem; line-height: 1.4;">
                                    ${Object.keys(breakdown.byType).length > 0
                                        ? Object.entries(breakdown.byType)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([type, qty]) => `<div>${type}: <strong>${qty}</strong></div>`)
                                            .join('')
                                        : '<span style="color: var(--text-secondary);">-</span>'
                                    }
                                </div>
                                <div style="color: var(--primary); font-weight: bold;">
                                    ${costPerDeliverable > 0 ? `R$ ${formatCurrency(costPerDeliverable)}` : '-'}
                                </div>
                                <div style="color: var(--success); font-weight: bold;">
                                    ${avgTicket > 0 ? `R$ ${formatCurrency(avgTicket)}` : '-'}
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-small btn-primary" onclick="window.showPersonBreakdown('${person.id}')" title="Ver Cálculo Detalhado">🔍</button>
                                    <button class="btn btn-small btn-secondary" onclick="window.editPerson('${person.id}')" title="Editar">✏️</button>
                                    <button class="btn btn-small btn-danger" onclick="window.deletePerson('${person.id}')" title="Excluir">🗑️</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ─── LISTA DO MODAL "COPIAR MÊS" ─────────────────────────────────────────────

function renderCopyMonthList(people, previousPeriod) {
    if (people.length === 0) {
        return '<p style="color: var(--text-secondary);">Nenhuma pessoa cadastrada.</p>';
    }

    return people.map(person => {
        const prevSalary    = storage.getSalaryForPeriod(person.id, previousPeriod);
        const salary        = prevSalary !== null ? prevSalary : person.salary;

        return `
            <div class="copy-month-row" data-person-id="${person.id}"
                style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 6px; padding: 1rem;
                       display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 1rem; align-items: center;">

                <div>
                    <strong>${person.name}</strong>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${person.role}</div>
                </div>

                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                    Anterior:<br>
                    <strong>R$ ${formatCurrency(salary)}</strong>
                </div>

                <div>
                    <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">Novo salário</label>
                    <input
                        type="number"
                        class="form-input copy-salary-input"
                        data-person-id="${person.id}"
                        value="${salary}"
                        step="0.01"
                        min="0"
                        style="font-size: 0.9rem; padding: 0.4rem 0.6rem;"
                        oninput="window.updateCopyMonthSummary()"
                    >
                </div>

                <div style="text-align: center;">
                    <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">Demitido</label>
                    <input
                        type="checkbox"
                        class="copy-dismissed-input"
                        data-person-id="${person.id}"
                        style="width: 18px; height: 18px; cursor: pointer;"
                        onchange="window.toggleDismissed('${person.id}', this.checked)"
                    >
                </div>
            </div>
        `;
    }).join('');
}

// ─── MODAL: COPIAR MÊS ───────────────────────────────────────────────────────

function openCopyMonthModal() {
    document.getElementById('copy-month-modal').classList.add('active');
    updateCopyMonthSummary();
}

function closeCopyMonthModal() {
    document.getElementById('copy-month-modal').classList.remove('active');
}

function toggleDismissed(personId, isDismissed) {
    const row   = document.querySelector(`.copy-month-row[data-person-id="${personId}"]`);
    const input = row.querySelector('.copy-salary-input');

    if (isDismissed) {
        input.value    = 0;
        input.disabled = true;
        row.style.opacity = '0.45';
    } else {
        input.disabled = false;
        row.style.opacity = '1';
    }
    updateCopyMonthSummary();
}

function updateCopyMonthSummary() {
    const summaryEl = document.getElementById('copy-month-summary');
    if (!summaryEl) return;

    const inputs    = document.querySelectorAll('.copy-salary-input:not(:disabled)');
    const dismissed = document.querySelectorAll('.copy-dismissed-input:checked');

    let total = 0;
    inputs.forEach(input => { total += parseFloat(input.value) || 0; });

    summaryEl.textContent =
        `${inputs.length} ativos · ${dismissed.length} demitidos · Folha: R$ ${formatCurrency(total)}`;
}

function applyCopyMonth() {
    const currentPeriod = storage.getCurrentPeriod();
    const rows = document.querySelectorAll('.copy-month-row');

    let applied   = 0;
    let dismissed = 0;

    rows.forEach(row => {
        const personId       = row.dataset.personId;
        const salaryInput    = row.querySelector('.copy-salary-input');
        const dismissedInput = row.querySelector('.copy-dismissed-input');

        const isDismissed = dismissedInput.checked;
        const salary      = parseFloat(salaryInput.value) || 0;

        if (isDismissed) {
            storage.setSalaryForPeriod(personId, currentPeriod, 0, 'inactive');
            dismissed++;
        } else {
            storage.setSalaryForPeriod(personId, currentPeriod, salary, 'active');
            applied++;
        }
    });

    closeCopyMonthModal();

    const msg = `✅ ${applied} salários aplicados em ${currentPeriod}` +
        (dismissed > 0 ? ` · ${dismissed} marcados como demitidos` : '');

    if (typeof window.showToast === 'function') {
        window.showToast(msg);
    } else {
        alert(msg);
    }

    renderPeoplePage();
}

// ─── BREAKDOWN DETALHADO DA PESSOA ───────────────────────────────────────────

function showPersonBreakdown(personId) {
    const person              = personService.getPerson(personId);
    const contracts           = analyticsService.getPersonContracts(personId);
    const totalWeightedPoints = analyticsService.getPersonTotalWeightedDeliverables(personId);
    const deliverableTypes    = deliverableTypeService.getActiveDeliverableTypes();

    const currentPeriod   = storage.getCurrentPeriod();
    const periodSalary    = storage.getSalaryForPeriod(person.id, currentPeriod);
    const effectiveSalary = periodSalary !== null ? periodSalary : person.salary;
    const costPerPoint    = totalWeightedPoints > 0 ? effectiveSalary / totalWeightedPoints : 0;

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
                    let contractWeightedPoints = 0;
                    const deliverablesDetail   = [];

                    if (contract.deliverables) {
                        Object.entries(contract.deliverables).forEach(([typeId, qty]) => {
                            const type = deliverableTypes.find(dt => dt.id === typeId);
                            if (type && type.roles && type.roles.includes(person.role)) {
                                const weight = analyticsService.getWeightForRole(person.role, typeId);
                                const points = qty * weight;
                                contractWeightedPoints += points;
                                deliverablesDetail.push({ name: type.name, qty, weight, points });
                            }
                        });
                    }

                    const contractCost = contractWeightedPoints * costPerPoint;
                    if (contractWeightedPoints === 0) return '';

                    return `
                        <div style="background: var(--bg); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <strong style="color: var(--fast-green);">${contract.client}</strong>
                                <span style="color: var(--fast-green); font-weight: bold;">R$ ${formatCurrency(contractCost)}</span>
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                                ${deliverablesDetail.map(d =>
                                    `├─ ${d.qty} ${d.name} × peso ${d.weight.toFixed(1)} = ${d.points.toFixed(1)} pontos`
                                ).join('<br>')}
                                <br>└─ <strong style="color: var(--text-primary);">SUBTOTAL: ${contractWeightedPoints.toFixed(1)} pts × R$ ${formatCurrency(costPerPoint)} = R$ ${formatCurrency(contractCost)}</strong>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    const isValid = Math.abs((totalWeightedPoints * costPerPoint) - effectiveSalary) < 0.01;
    const summaryHtml = `
        <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 8px; border: 2px solid var(--fast-green);">
            <h3 style="color: var(--fast-green); margin: 0 0 1rem 0; font-size: 1rem; text-transform: uppercase;">✅ Resumo do Cálculo</h3>
            <div style="display: grid; gap: 0.75rem;">
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>📦 Total de Pontos (todos contratos):</span>
                    <strong>${totalWeightedPoints.toFixed(1)} pontos</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px;">
                    <span>💰 Custo por Ponto:</span>
                    <strong>R$ ${formatCurrency(effectiveSalary)} ÷ ${totalWeightedPoints.toFixed(1)} = R$ ${formatCurrency(costPerPoint)}/ponto</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg); border-radius: 4px; border: 1px solid var(--fast-green);">
                    <span style="font-weight: 700;">✅ Validação:</span>
                    <strong style="color: var(--fast-green);">${totalWeightedPoints.toFixed(1)} × R$ ${formatCurrency(costPerPoint)} = R$ ${formatCurrency(totalWeightedPoints * costPerPoint)}</strong>
                </div>
                <div style="text-align: center; padding: 0.75rem; background: var(${isValid ? '--success' : '--error'}); color: white; border-radius: 4px; font-weight: bold;">
                    ${isValid ? '✓ Cálculo correto! O total bate com o salário.' : '⚠️ Diferença detectada! Verifique os contratos.'}
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
    window.openCopyMonthModal        = openCopyMonthModal;
    window.closeCopyMonthModal       = closeCopyMonthModal;
    window.applyCopyMonth            = applyCopyMonth;
    window.toggleDismissed           = toggleDismissed;
    window.updateCopyMonthSummary    = updateCopyMonthSummary;
}

function openPersonModal() {
    currentEditId = null;
    document.getElementById('person-modal').classList.add('active');
    document.getElementById('modal-title').textContent = 'Nova Pessoa';
    document.getElementById('person-form').reset();
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

    document.getElementById('modal-title').textContent = 'Editar Pessoa';
    document.getElementById('person-modal').classList.add('active');
}

function handlePersonSubmit(e) {
    e.preventDefault();

    const formData = {
        name:   document.getElementById('name').value,
        role:   document.getElementById('role').value,
        salary: parseFloat(document.getElementById('salary').value)
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
