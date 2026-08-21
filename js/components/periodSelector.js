// periodSelector.js - v4: seletor simples de mês de referência.
// Sem confirmar períodos, sem criar meses, sem histórico.

import periodService from '../services/periodService.js';

export function renderPeriodSelector() {
    const cur = periodService.getCurrentPeriod();
    const prev = periodService.getPreviousPeriod(cur);
    const next = periodService.getNextPeriod(cur);
    const prevLabel = periodService.getPeriodLabel(prev);
    const nextLabel = periodService.getPeriodLabel(next);

    const [year, month] = cur.split('-').map(Number);
    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    return `
        <div class="period-selector" id="period-selector-root">
            <button class="period-nav-btn" onclick="window.changePeriod('${prev}')" title="${prevLabel}">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="period-nav-label">${prevLabel}</span>
            </button>

            <div class="period-current">
                <span class="period-month">${monthNames[month - 1]}</span>
                <span class="period-year">${year}</span>
            </div>

            <button class="period-nav-btn period-nav-btn--right" onclick="window.changePeriod('${next}')" title="${nextLabel}">
                <span class="period-nav-label">${nextLabel}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>

        <style>
            .period-selector {
                display: flex; align-items: center; justify-content: center;
                gap: 0.25rem; margin-bottom: 1.75rem;
            }
            .period-nav-btn {
                display: flex; align-items: center; gap: 0.4rem;
                background: transparent; border: 1px solid var(--border, #2a2a2a);
                border-radius: 8px; color: var(--text-secondary, #888);
                font-size: 0.78rem; font-weight: 500; padding: 0.45rem 0.75rem;
                cursor: pointer; transition: color 0.15s, border-color 0.15s, background 0.15s;
                white-space: nowrap; font-family: inherit;
            }
            .period-nav-btn:hover {
                color: var(--text-primary, #e0e0e0);
                border-color: var(--text-secondary, #888);
                background: rgba(255,255,255,0.04);
            }
            .period-current {
                display: flex; align-items: baseline; gap: 0.45rem;
                padding: 0.5rem 1.5rem; border-radius: 10px;
                background: var(--bg-card, #1a1a1a);
                border: 1px solid var(--border, #2a2a2a);
                min-width: 180px; justify-content: center;
            }
            .period-month { font-size: 1.1rem; font-weight: 700; color: var(--primary, #00ff41); }
            .period-year  { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary, #888); }
            @media (max-width: 600px) {
                .period-nav-label { display: none; }
                .period-nav-btn   { padding: 0.45rem 0.6rem; }
                .period-current   { min-width: 140px; padding: 0.5rem 1rem; }
            }
        </style>
    `;
}

window.changePeriod = function(periodId) {
    periodService.setCurrentPeriod(periodId);
    window.location.reload();
};
