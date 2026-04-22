// periodSelector.js - Period selector component

import periodService from '../services/periodService.js';

export function renderPeriodSelector() {
    const currentPeriod = periodService.getCurrentPeriod();
    const currentLabel = periodService.getPeriodLabel(currentPeriod);
    const previousPeriod = periodService.getPreviousPeriod(currentPeriod);
    const nextPeriod = periodService.getNextPeriod(currentPeriod);
    
    const currentMonthYear = periodService.getCurrentMonthYear();
    const isCurrentMonth = currentPeriod === currentMonthYear.periodId;

    return `
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 1rem;">
            <!-- Previous Month Button -->
            <button 
                class="btn btn-secondary" 
                onclick="window.changePeriod('${previousPeriod}')"
                style="padding: 0.5rem 1rem; font-size: 1rem;">
                ◀ ${periodService.getPeriodLabel(previousPeriod)}
            </button>
            
            <!-- Current Period Display -->
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 1.5rem;">📅</span>
                <div style="text-align: center;">
                    <div style="font-size: 1.3rem; font-weight: bold; color: var(--primary);">
                        ${currentLabel}
                    </div>
                    ${!isCurrentMonth ? `
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            Visualizando histórico
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Next Month Button -->
            <button 
                class="btn btn-secondary" 
                onclick="window.changePeriod('${nextPeriod}')"
                style="padding: 0.5rem 1rem; font-size: 1rem;">
                ${periodService.getPeriodLabel(nextPeriod)} ▶
            </button>
            
            <!-- Quick Jump to Current Month -->
            ${!isCurrentMonth ? `
                <button 
                    class="btn btn-primary" 
                    onclick="window.changePeriod('${currentMonthYear.periodId}')"
                    style="padding: 0.5rem 1rem; margin-left: 1rem;">
                    📍 Ir para Mês Atual
                </button>
            ` : ''}
        </div>
    `;
}

// Global function to change period
window.changePeriod = function(periodId) {
    // Check if period exists, if not create it
    if (!periodService.periodExists(periodId)) {
        const confirm = window.confirm(`O período ${periodService.getPeriodLabel(periodId)} não existe. Deseja criar copiando os dados do mês anterior?`);
        if (confirm) {
            periodService.createPeriodFromPrevious(periodId);
        } else {
            return;
        }
    }
    
    // Set as current period
    periodService.setCurrentPeriod(periodId);
    
    // Reload current page to show new period data
    window.location.reload();
};
