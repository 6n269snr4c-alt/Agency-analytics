// squadComparisonPage.js - Squad comparison page with detailed breakdown
import { renderPeriodSelector } from '../components/periodSelector.js';

import squadService from '../services/squadService.js';
import analyticsService from '../services/analyticsService.js';
import deliverableTypeService from '../services/deliverableTypeService.js';

export function renderSquadComparisonPage() {
    const contentEl = document.getElementById('content');
    const squads = squadService.getAllSquads();

    if (squads.length === 0) {
        contentEl.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Comparação de Squads</h1>
                <p class="page-subtitle">Compare o desempenho dos squads</p>
            </div>

        <!-- Period Selector -->
        ${renderPeriodSelector()}
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <h3>Nenhum squad cadastrado</h3>
                <p>Crie squads para ver comparações</p>
            </div>
        `;
        return;
    }

    const squadStats = squads.map(squad => {
        const roi = analyticsService.getSquadROI(squad.id);
        const contracts = analyticsService.getSquadContracts(squad.id);
        const members = squadService.getSquadMembers(squad.id);
        const head = squadService.getSquadHead(squad.id);
        const deliverableBreakdown = getSquadDeliverableBreakdown(squad.id, contracts);
        
        return {
            squad,
            roi,
            contracts,
            members,
            head,
            deliverableBreakdown
        };
    });

    contentEl.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Comparação de Squads</h1>
            <p class="page-subtitle">Análise detalhada de desempenho por squad - lado a lado</p>
        </div>

        <!-- Period Selector -->
        ${renderPeriodSelector()}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; align-items: start;">
            ${squadStats.map(stats => renderSquadCard(stats)).join('')}
        </div>
    `;
}

function getSquadDeliverableBreakdown(squadId, contracts) {
    const breakdown = {};
    
    contracts.forEach(contract => {
        if (contract.deliverables) {
            Object.entries(contract.deliverables).forEach(([typeId, qty]) => {
                const type = deliverableTypeService.getDeliverableType(typeId);
                if (type) {
                    if (!breakdown[type.name]) {
                        breakdown[type.name] = 0;
                    }
                    breakdown[type.name] += qty;
                }
            });
        }
    });
    
    return breakdown;
}

function renderSquadCard(stats) {
    const { squad, roi, contracts, members, head, deliverableBreakdown } = stats;
    
    // Calculate team cost breakdown
    const teamCostBreakdown = [];
    let totalTeamCost = 0;
    
    // Add members
    members.forEach(member => {
        teamCostBreakdown.push({
            name: member.name,
            role: member.role,
            salary: member.salary,
            isHead: false
        });
        totalTeamCost += member.salary;
    });
    
    // Add head
    if (head) {
        teamCostBreakdown.push({
            name: head.name,
            role: head.role,
            salary: head.salary,
            isHead: true
        });
        totalTeamCost += head.salary;
    }

    // Calculate average ticket
    const totalRevenue = contracts.reduce((sum, c) => sum + c.value, 0);
    const avgTicket = contracts.length > 0 ? totalRevenue / contracts.length : 0;

    return `
        <div style="background: var(--bg-darker); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem;">
            <!-- Squad Header -->
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--border);">
                ${squad.icon ? `<span style="font-size: 2.5rem;">${squad.icon}</span>` : ''}
                <div style="flex: 1;">
                    <h3 style="margin: 0; font-size: 1.5rem; color: var(--primary);">${squad.name}</h3>
                    ${squad.description ? `<p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">${squad.description}</p>` : ''}
                </div>
            </div>

            <!-- Main Metrics -->
            <div style="display: grid; gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: var(--bg); padding: 1rem; border-radius: 6px;">
                    <div style="color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 0.25rem; text-transform: uppercase;">Contratos</div>
                    <div style="font-size: 1.8rem; font-weight: bold; color: var(--primary);">${contracts.length}</div>
                </div>
                
                <div style="background: var(--bg); padding: 1rem; border-radius: 6px;">
                    <div style="color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 0.25rem; text-transform: uppercase;">Receita</div>
                    <div style="font-size: 1.8rem; font-weight: bold; color: var(--success);">R$ ${formatCurrency(roi.revenue)}</div>
                </div>
                
                <div style="background: var(--bg); padding: 1rem; border-radius: 6px;">
                    <div style="color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 0.25rem; text-transform: uppercase;">Lucro</div>
                    <div style="font-size: 1.8rem; font-weight: bold; color: ${roi.profit > 0 ? 'var(--success)' : 'var(--error)'};">
                        R$ ${formatCurrency(roi.profit)}
                    </div>
                </div>
                
                <div style="background: var(--bg); padding: 1rem; border-radius: 6px;">
                    <div style="color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 0.25rem; text-transform: uppercase;">Margem</div>
                    <div style="font-size: 1.8rem; font-weight: bold;">${roi.margin.toFixed(1)}%</div>
                </div>
                
                <div style="background: var(--bg); padding: 1rem; border-radius: 6px;">
                    <div style="color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 0.25rem; text-transform: uppercase;">Ticket Médio</div>
                    <div style="font-size: 1.8rem; font-weight: bold; color: var(--primary);">R$ ${formatCurrency(avgTicket)}</div>
                </div>
            </div>

            <!-- Entregáveis -->
            <div style="background: var(--bg); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                <h4 style="margin: 0 0 0.75rem 0; color: var(--primary); font-size: 1rem;">📦 Entregáveis</h4>
                ${Object.keys(deliverableBreakdown).length > 0 ? `
                    <div style="display: grid; gap: 0.5rem; max-height: 200px; overflow-y: auto;">
                        ${Object.entries(deliverableBreakdown)
                            .sort((a, b) => b[1] - a[1])
                            .map(([type, qty]) => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-darker); border-radius: 4px; font-size: 0.9rem;">
                                    <span>${type}</span>
                                    <strong style="color: var(--primary);">${qty}</strong>
                                </div>
                            `).join('')}
                    </div>
                ` : `
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">Nenhum entregável</p>
                `}
            </div>

            <!-- Custo do Time -->
            <div style="background: var(--bg); padding: 1rem; border-radius: 6px;">
                <h4 style="margin: 0 0 0.75rem 0; color: var(--primary); font-size: 1rem;">👥 Custo do Time</h4>
                ${teamCostBreakdown.length > 0 ? `
                    <div style="display: grid; gap: 0.5rem; max-height: 200px; overflow-y: auto;">
                        ${teamCostBreakdown.map(member => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-darker); border-radius: 4px; ${member.isHead ? 'border-left: 3px solid var(--primary);' : ''} font-size: 0.9rem;">
                                <div>
                                    <div style="font-weight: 500;">${member.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                        ${member.role}${member.isHead ? ' (Head)' : ''}
                                    </div>
                                </div>
                                <strong style="color: var(--primary);">R$ ${formatCurrency(member.salary)}</strong>
                            </div>
                        `).join('')}
                        <div style="margin-top: 0.5rem; padding-top: 0.75rem; border-top: 2px solid var(--border); display: flex; justify-content: space-between; align-items: center; font-size: 1rem;">
                            <strong>TOTAL:</strong>
                            <strong style="font-size: 1.2rem; color: var(--primary);">R$ ${formatCurrency(totalTeamCost)}</strong>
                        </div>
                    </div>
                ` : `
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">Nenhum membro</p>
                `}
            </div>
        </div>
    `;
}

function formatCurrency(value) {
    return value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
