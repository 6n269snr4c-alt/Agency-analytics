// evolutionPage.js - Period evolution and comparison page
import { renderPeriodSelector } from '../components/periodSelector.js';

import periodService from '../services/periodService.js';
import analyticsService from '../services/analyticsService.js';
import storage from '../store/storage.js';

export function renderEvolutionPage() {
    const contentEl = document.getElementById('content');
    
    // Get all periods
    const allPeriods = periodService.getAllPeriods();
    
    // Get last 6 months data
    const last6Periods = allPeriods.slice(0, 6);
    
    const evolutionData = last6Periods.map(period => {
        // Temporarily switch to this period to get ROI
        const currentPeriod = periodService.getCurrentPeriod();
        storage.setCurrentPeriod(period.id);
        const roi = analyticsService.getOverallROI();
        storage.setCurrentPeriod(currentPeriod); // Restore
        
        return {
            period,
            roi
        };
    }).reverse(); // Oldest first for display

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Evolução Mensal</h1>
            <p class="page-subtitle">Análise de desempenho ao longo do tempo</p>
        </div>

        <!-- Period Selector -->
        ${renderPeriodSelector()}

        ${evolutionData.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <h3>Nenhum histórico disponível</h3>
                <p>Comece usando o sistema e volte aqui para ver a evolução!</p>
            </div>
        ` : `
            <!-- Evolution Table -->
            <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; overflow-x: auto; margin-bottom: 2rem;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--bg); border-bottom: 2px solid var(--border);">
                            <th style="padding: 1rem; text-align: left; font-weight: bold; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; border-right: 1px solid var(--border);">
                                PERÍODO
                            </th>
                            <th style="padding: 1rem; text-align: right; font-weight: bold; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; border-right: 1px solid var(--border);">
                                RECEITA
                            </th>
                            <th style="padding: 1rem; text-align: right; font-weight: bold; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; border-right: 1px solid var(--border);">
                                CUSTO
                            </th>
                            <th style="padding: 1rem; text-align: right; font-weight: bold; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; border-right: 1px solid var(--border);">
                                LUCRO
                            </th>
                            <th style="padding: 1rem; text-align: center; font-weight: bold; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase; border-right: 1px solid var(--border);">
                                MARGEM
                            </th>
                            <th style="padding: 1rem; text-align: center; font-weight: bold; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase;">
                                TENDÊNCIA
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${evolutionData.map((data, index) => {
                            const { period, roi } = data;
                            const prevData = index > 0 ? evolutionData[index - 1] : null;
                            
                            let revenueTrend = '';
                            let profitTrend = '';
                            let marginTrend = '';
                            
                            if (prevData) {
                                const revenueDiff = roi.revenue - prevData.roi.revenue;
                                const profitDiff = roi.profit - prevData.roi.profit;
                                const marginDiff = roi.margin - prevData.roi.margin;
                                
                                revenueTrend = revenueDiff > 0 ? '📈' : revenueDiff < 0 ? '📉' : '➡️';
                                profitTrend = profitDiff > 0 ? '📈' : profitDiff < 0 ? '📉' : '➡️';
                                marginTrend = marginDiff > 0 ? '📈' : marginDiff < 0 ? '📉' : '➡️';
                            }
                            
                            return `
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 0.75rem; border-right: 1px solid var(--border); font-weight: 500;">
                                        ${period.label}
                                    </td>
                                    <td style="padding: 0.75rem; text-align: right; border-right: 1px solid var(--border); white-space: nowrap;">
                                        R$ ${formatCurrency(roi.revenue)}
                                    </td>
                                    <td style="padding: 0.75rem; text-align: right; border-right: 1px solid var(--border); white-space: nowrap; color: var(--text-secondary);">
                                        R$ ${formatCurrency(roi.cost)}
                                    </td>
                                    <td style="padding: 0.75rem; text-align: right; border-right: 1px solid var(--border); white-space: nowrap; color: ${roi.profit > 0 ? 'var(--success)' : 'var(--error)'}; font-weight: 500;">
                                        R$ ${formatCurrency(roi.profit)}
                                    </td>
                                    <td style="padding: 0.75rem; text-align: center; border-right: 1px solid var(--border); font-weight: 500;">
                                        ${roi.margin.toFixed(1)}%
                                    </td>
                                    <td style="padding: 0.75rem; text-align: center; font-size: 1.2rem;">
                                        ${profitTrend}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                ${renderSummaryCard('Melhor Mês (Lucro)', getBestMonth(evolutionData, 'profit'))}
                ${renderSummaryCard('Pior Mês (Lucro)', getWorstMonth(evolutionData, 'profit'))}
                ${renderSummaryCard('Maior Receita', getBestMonth(evolutionData, 'revenue'))}
                ${renderSummaryCard('Melhor Margem', getBestMonth(evolutionData, 'margin'))}
            </div>

            <!-- Insights -->
            <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; color: var(--primary);">💡 Insights</h3>
                ${generateInsights(evolutionData)}
            </div>
        `}
    `;
}

function renderSummaryCard(title, data) {
    if (!data) return '';
    
    return `
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem;">
            <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem; text-transform: uppercase;">
                ${title}
            </div>
            <div style="font-size: 1.3rem; font-weight: bold; color: var(--primary); margin-bottom: 0.5rem;">
                ${data.period.label}
            </div>
            <div style="font-size: 1.1rem; color: var(--success);">
                R$ ${formatCurrency(data.value)}
            </div>
        </div>
    `;
}

function getBestMonth(data, metric) {
    if (data.length === 0) return null;
    
    const best = data.reduce((max, current) => {
        return current.roi[metric] > max.roi[metric] ? current : max;
    });
    
    return {
        period: best.period,
        value: best.roi[metric]
    };
}

function getWorstMonth(data, metric) {
    if (data.length === 0) return null;
    
    const worst = data.reduce((min, current) => {
        return current.roi[metric] < min.roi[metric] ? current : min;
    });
    
    return {
        period: worst.period,
        value: worst.roi[metric]
    };
}

function generateInsights(data) {
    if (data.length < 2) {
        return '<p style="color: var(--text-secondary);">Adicione mais meses para ver insights!</p>';
    }
    
    const insights = [];
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    
    // Revenue trend
    const revenueDiff = latest.roi.revenue - previous.roi.revenue;
    const revenuePercent = ((revenueDiff / previous.roi.revenue) * 100).toFixed(1);
    
    if (revenueDiff > 0) {
        insights.push(`📈 Receita cresceu <strong>R$ ${formatCurrency(Math.abs(revenueDiff))}</strong> (${revenuePercent}%) em relação ao mês anterior`);
    } else if (revenueDiff < 0) {
        insights.push(`📉 Receita caiu <strong>R$ ${formatCurrency(Math.abs(revenueDiff))}</strong> (${Math.abs(revenuePercent)}%) em relação ao mês anterior`);
    } else {
        insights.push(`➡️ Receita manteve-se estável em relação ao mês anterior`);
    }
    
    // Profit trend
    const profitDiff = latest.roi.profit - previous.roi.profit;
    const profitPercent = previous.roi.profit !== 0 ? ((profitDiff / previous.roi.profit) * 100).toFixed(1) : 0;
    
    if (profitDiff > 0) {
        insights.push(`💰 Lucro aumentou <strong>R$ ${formatCurrency(Math.abs(profitDiff))}</strong> (${profitPercent}%) em relação ao mês anterior`);
    } else if (profitDiff < 0) {
        insights.push(`⚠️ Lucro diminuiu <strong>R$ ${formatCurrency(Math.abs(profitDiff))}</strong> (${Math.abs(profitPercent)}%) em relação ao mês anterior`);
    }
    
    // Margin trend
    const marginDiff = latest.roi.margin - previous.roi.margin;
    
    if (marginDiff > 1) {
        insights.push(`📊 Margem melhorou <strong>${marginDiff.toFixed(1)} pontos percentuais</strong>`);
    } else if (marginDiff < -1) {
        insights.push(`⚠️ Margem caiu <strong>${Math.abs(marginDiff).toFixed(1)} pontos percentuais</strong>`);
    }
    
    // Average calculations
    const avgRevenue = data.reduce((sum, d) => sum + d.roi.revenue, 0) / data.length;
    const avgProfit = data.reduce((sum, d) => sum + d.roi.profit, 0) / data.length;
    
    insights.push(`📊 Média de receita nos últimos ${data.length} meses: <strong>R$ ${formatCurrency(avgRevenue)}</strong>`);
    insights.push(`💵 Média de lucro nos últimos ${data.length} meses: <strong>R$ ${formatCurrency(avgProfit)}</strong>`);
    
    return `
        <ul style="margin: 0; padding-left: 1.5rem;">
            ${insights.map(insight => `<li style="margin: 0.75rem 0; line-height: 1.6;">${insight}</li>`).join('')}
        </ul>
    `;
}

function formatCurrency(value) {
    return value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
