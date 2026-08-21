// validationPage.js — v4
// Conferência salarial: compara o salário cadastrado de cada pessoa
// com o total que foi alocado a ela em contratos.

import analyticsService from '../services/analyticsService.js';
import storage from '../store/storage.js';

function fmt(value) {
    return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function renderValidationPage() {
    const contentEl = document.getElementById('content');
    const currentPeriod = storage.getCurrentPeriod();

    const reconciliation = analyticsService.getSalaryReconciliation(currentPeriod);

    const totalSalary    = reconciliation.reduce((s, r) => s + r.salary, 0);
    const totalAllocated = reconciliation.reduce((s, r) => s + r.allocated, 0);
    const problemCount    = reconciliation.filter(r => !r.isOk).length;

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Conferência Salarial</h1>
            <p class="page-subtitle">Compara o salário de cada pessoa com o total alocado em contratos</p>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; margin-bottom:2rem;">
            <div class="stat-card">
                <div class="stat-value">R$ ${fmt(totalSalary)}</div>
                <div class="stat-label">Folha Total (cadastrada)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">R$ ${fmt(totalAllocated)}</div>
                <div class="stat-label">Total Alocado em Contratos</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:${problemCount > 0 ? 'var(--error,#f44336)' : 'var(--fast-green,#7cfc00)'}">${problemCount}</div>
                <div class="stat-label">Pessoa(s) com divergência</div>
            </div>
        </div>

        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem;">
            <h3 style="margin: 0 0 1.5rem 0; color: var(--primary, var(--fast-green));">Detalhamento por Pessoa</h3>
            ${reconciliation.length === 0 ? `
                <p style="color: var(--text-secondary);">Nenhuma pessoa cadastrada</p>
            ` : `
                <div style="display:grid; gap:0.75rem;">
                    ${reconciliation.map(r => renderPersonRow(r)).join('')}
                </div>
            `}
        </div>
    `;
}

function renderPersonRow(r) {
    const statusColor = r.isOk ? 'var(--fast-green,#7cfc00)' : 'var(--error,#f44336)';
    const statusLabel = r.isFixedOnly
        ? '✓ Só valores fixos (não precisa bater)'
        : r.isOk
            ? (r.isHead ? '✓ Bate (rateio automático de Head)' : '✓ Bate com o salário')
            : (r.diff > 0
                ? (r.isHead
                    ? `⚠️ Faltam R$ ${fmt(r.diff)} — squad sem contrato confirmado neste mês`
                    : `⚠️ Faltam R$ ${fmt(r.diff)} sem contrato`)
                : `⚠️ R$ ${fmt(Math.abs(r.diff))} acima do salário`);

    return `
        <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 2fr; gap:1rem; align-items:center;
                     padding:0.875rem; background:var(--bg); border:1px solid var(--border); border-radius:6px;">
            <div>
                <strong>${r.name}</strong>
                <div style="font-size:0.8rem; color:var(--text-secondary);">${r.role}</div>
            </div>
            <div style="color:var(--text-secondary);">Salário: <strong>R$ ${fmt(r.salary)}</strong></div>
            <div style="color:var(--text-secondary);">Alocado: <strong style="color:var(--fast-green,#7cfc00);">R$ ${fmt(r.allocated)}</strong></div>
            <div style="color:${statusColor}; font-size:0.85rem; font-weight:600; text-align:right;">${statusLabel}</div>
        </div>
    `;
}
