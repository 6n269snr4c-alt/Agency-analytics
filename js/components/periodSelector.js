// periodSelector.js - Period selector component (redesign elegante)

import periodService from '../services/periodService.js';

export function renderPeriodSelector() {
    const currentPeriod    = periodService.getCurrentPeriod();
    const currentLabel     = periodService.getPeriodLabel(currentPeriod);
    const previousPeriod   = periodService.getPreviousPeriod(currentPeriod);
    const nextPeriod       = periodService.getNextPeriod(currentPeriod);
    const prevLabel        = periodService.getPeriodLabel(previousPeriod);
    const nextLabel        = periodService.getPeriodLabel(nextPeriod);

    const currentMonthYear = periodService.getCurrentMonthYear();
    const isCurrentMonth   = currentPeriod === currentMonthYear.periodId;

    // Extrai mês e ano para exibição separada
    const [year, month] = currentPeriod.split('-').map(Number);
    const monthNames = [
        'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
    ];
    const monthName = monthNames[month - 1];

    return `
        <div class="period-selector" id="period-selector-root">
            <!-- Seta anterior -->
            <button
                class="period-nav-btn"
                onclick="window.changePeriod('${previousPeriod}')"
                title="Ir para ${prevLabel}"
                aria-label="Mês anterior: ${prevLabel}"
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="period-nav-label">${prevLabel}</span>
            </button>

            <!-- Período atual -->
            <div class="period-current ${!isCurrentMonth ? 'period-current--historical' : ''}">
                <span class="period-month">${monthName}</span>
                <span class="period-year">${year}</span>
                ${!isCurrentMonth ? `<span class="period-historical-badge">histórico</span>` : ''}
            </div>

            <!-- Seta próximo -->
            <button
                class="period-nav-btn period-nav-btn--right"
                onclick="window.changePeriod('${nextPeriod}')"
                title="Ir para ${nextLabel}"
                aria-label="Próximo mês: ${nextLabel}"
            >
                <span class="period-nav-label">${nextLabel}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>

            <!-- Botão "Mês Atual" — só aparece em histórico -->
            ${!isCurrentMonth ? `
                <button
                    class="period-today-btn"
                    onclick="window.changePeriod('${currentMonthYear.periodId}')"
                    title="Voltar para o mês atual"
                >
                    Mês atual
                </button>
            ` : ''}
        </div>

        <style>
            .period-selector {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.25rem;
                margin-bottom: 1.75rem;
                position: relative;
            }

            /* ── Botões de navegação ── */
            .period-nav-btn {
                display: flex;
                align-items: center;
                gap: 0.4rem;
                background: transparent;
                border: 1px solid var(--border, #2a2a2a);
                border-radius: 8px;
                color: var(--text-secondary, #888);
                font-size: 0.78rem;
                font-weight: 500;
                padding: 0.45rem 0.75rem;
                cursor: pointer;
                transition: color 0.15s, border-color 0.15s, background 0.15s;
                white-space: nowrap;
                font-family: inherit;
            }
            .period-nav-btn:hover {
                color: var(--text-primary, #e0e0e0);
                border-color: var(--text-secondary, #888);
                background: rgba(255,255,255,0.04);
            }
            .period-nav-btn svg {
                flex-shrink: 0;
                opacity: 0.7;
            }
            .period-nav-label {
                /* oculta em telas muito pequenas */
            }

            /* ── Período atual (centro) ── */
            .period-current {
                display: flex;
                align-items: baseline;
                gap: 0.45rem;
                padding: 0.5rem 1.5rem;
                border-radius: 10px;
                background: var(--bg-card, #1a1a1a);
                border: 1px solid var(--border, #2a2a2a);
                position: relative;
                min-width: 180px;
                justify-content: center;
            }
            .period-current--historical {
                border-color: var(--warning, #ff9800);
                box-shadow: 0 0 0 1px rgba(255,152,0,0.2);
            }
            .period-month {
                font-size: 1.1rem;
                font-weight: 700;
                color: var(--primary, #00ff41);
                letter-spacing: 0.01em;
            }
            .period-year {
                font-size: 0.85rem;
                font-weight: 500;
                color: var(--text-secondary, #888);
            }
            .period-historical-badge {
                position: absolute;
                bottom: -9px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--warning, #ff9800);
                color: #000;
                font-size: 0.6rem;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                padding: 0.1rem 0.5rem;
                border-radius: 10px;
                white-space: nowrap;
            }

            /* ── Botão "Mês atual" ── */
            .period-today-btn {
                position: absolute;
                right: 0;
                background: transparent;
                border: 1px solid var(--primary, #00ff41);
                border-radius: 8px;
                color: var(--primary, #00ff41);
                font-size: 0.75rem;
                font-weight: 600;
                padding: 0.4rem 0.85rem;
                cursor: pointer;
                transition: background 0.15s, color 0.15s;
                font-family: inherit;
                letter-spacing: 0.02em;
            }
            .period-today-btn:hover {
                background: var(--primary, #00ff41);
                color: #000;
            }

            /* ── Responsivo ── */
            @media (max-width: 600px) {
                .period-nav-label { display: none; }
                .period-nav-btn   { padding: 0.45rem 0.6rem; }
                .period-current   { min-width: 140px; padding: 0.5rem 1rem; }
                .period-today-btn { position: static; margin-left: 0.5rem; }
            }
        </style>
    `;
}

// ─── global handler ───────────────────────────────────────────────────────────

window.changePeriod = function(periodId) {
    if (!periodService.periodExists(periodId)) {
        const label = periodService.getPeriodLabel(periodId);
        const ok = window.confirm(
            `O período ${label} ainda não existe.\nDeseja criá-lo copiando os dados do mês anterior?`
        );
        if (!ok) return;
        periodService.createPeriodFromPrevious(periodId);
    }

    periodService.setCurrentPeriod(periodId);
    window.location.reload();
};
