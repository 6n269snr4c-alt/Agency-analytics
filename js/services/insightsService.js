// insightsService.js - Automatic insights and alerts

import analyticsService from '../services/analyticsService.js';
import contractService from '../services/contractService.js';
import personService from '../services/personService.js';
import squadService from '../services/squadService.js';

class InsightsService {
    generateAllInsights() {
        const insights = [];
        
        // Profitability insights
        insights.push(...this.getProfitabilityInsights());
        
        // Productivity insights
        insights.push(...this.getProductivityInsights());
        
        // Resource allocation insights
        insights.push(...this.getResourceInsights());
        
        // Squad performance insights
        insights.push(...this.getSquadInsights());
        
        return insights.sort((a, b) => {
            const priority = { critical: 3, warning: 2, info: 1 };
            return priority[b.type] - priority[a.type];
        });
    }

    getProfitabilityInsights() {
        const insights = [];
        const overallROI = analyticsService.getOverallROI();
        
        // Check overall margin
        if (overallROI.margin < 20) {
            insights.push({
                type: 'critical',
                title: 'Margem geral baixa',
                message: `A margem da operação está em ${overallROI.margin.toFixed(1)}%. Recomendado: acima de 30%.`,
                action: 'Revisar contratos menos lucrativos ou renegociar valores'
            });
        } else if (overallROI.margin < 30) {
            insights.push({
                type: 'warning',
                title: 'Margem pode melhorar',
                message: `Margem atual: ${overallROI.margin.toFixed(1)}%. Há espaço para otimização.`,
                action: 'Analisar oportunidades de redução de custos'
            });
        }
        
        // Check negative contracts
        const contractRanking = analyticsService.getContractProfitabilityRanking();
        const negativeContracts = contractRanking.filter(c => c.profit < 0);
        
        if (negativeContracts.length > 0) {
            insights.push({
                type: 'critical',
                title: `${negativeContracts.length} contrato(s) no prejuízo`,
                message: `Contratos gerando prejuízo: ${negativeContracts.map(c => c.client).join(', ')}`,
                action: 'Revisar escopo ou renegociar valores imediatamente'
            });
        }
        
        // Check low-margin contracts (0-15%)
        const lowMarginContracts = contractRanking.filter(c => c.margin > 0 && c.margin < 15);
        
        if (lowMarginContracts.length > 0) {
            insights.push({
                type: 'warning',
                title: `${lowMarginContracts.length} contrato(s) com margem baixa`,
                message: `Contratos com margem < 15%: ${lowMarginContracts.map(c => c.client).join(', ')}`,
                action: 'Avaliar possibilidade de otimização ou reajuste'
            });
        }
        
        return insights;
    }

    getProductivityInsights() {
        const insights = [];
        const people = personService.getAllPeople();
        
        people.forEach(person => {
            const contracts = analyticsService.getPersonContracts(person.id);
            const totalDeliverables = analyticsService.getPersonTotalDeliverables(person.id);
            
            // Check if person has no contracts
            if (contracts.length === 0) {
                insights.push({
                    type: 'warning',
                    title: `${person.name} sem contratos`,
                    message: `${person.role} não está atribuído(a) a nenhum contrato`,
                    action: 'Alocar em projetos ou revisar necessidade da posição'
                });
            }
            
            // Check workload (very high deliverables per month)
            const avgDeliverablesPerContract = totalDeliverables / Math.max(contracts.length, 1);
            
            if (totalDeliverables > 100) {
                insights.push({
                    type: 'critical',
                    title: `${person.name} pode estar sobrecarregado(a)`,
                    message: `${totalDeliverables} entregas mensais é uma carga muito alta`,
                    action: 'Redistribuir trabalho ou contratar suporte'
                });
            } else if (totalDeliverables > 60) {
                insights.push({
                    type: 'warning',
                    title: `${person.name} com carga alta`,
                    message: `${totalDeliverables} entregas mensais - monitorar qualidade`,
                    action: 'Avaliar possibilidade de redistribuição'
                });
            }
        });
        
        return insights;
    }

    getResourceInsights() {
        const insights = [];
        const roles = personService.getAllRoles();
        
        roles.forEach(role => {
            const peopleInRole = personService.getPeopleByRole(role);
            const totalContracts = contractService.getAllContracts().length;
            
            // Check if role is underrepresented
            if (peopleInRole.length === 1 && totalContracts > 3) {
                insights.push({
                    type: 'warning',
                    title: `Ponto único de falha: ${role}`,
                    message: `Apenas 1 ${role} para ${totalContracts} contratos`,
                    action: 'Considerar contratar backup ou freelancer'
                });
            }
            
            // Check cost per deliverable disparity
            const comparison = analyticsService.comparePeopleByRole(role);
            if (comparison.length >= 2) {
                const costs = comparison.map(p => p.costPerDeliverable).filter(c => c > 0);
                if (costs.length >= 2) {
                    const maxCost = Math.max(...costs);
                    const minCost = Math.min(...costs);
                    const disparity = (maxCost / minCost - 1) * 100;
                    
                    if (disparity > 50) {
                        insights.push({
                            type: 'info',
                            title: `Disparidade de eficiência em ${role}`,
                            message: `Diferença de ${disparity.toFixed(0)}% no custo por entrega entre profissionais`,
                            action: 'Revisar distribuição de trabalho ou capacitação'
                        });
                    }
                }
            }
        });
        
        return insights;
    }

    getSquadInsights() {
        const insights = [];
        const squads = squadService.getAllSquads();
        
        squads.forEach(squad => {
            const roi = analyticsService.getSquadROI(squad.id);
            const members = squadService.getSquadMembers(squad.id);
            
            // Check squad profitability
            if (roi.profit < 0) {
                insights.push({
                    type: 'critical',
                    title: `Squad ${squad.name} no prejuízo`,
                    message: `Prejuízo de R$ ${Math.abs(roi.profit).toLocaleString('pt-BR')}`,
                    action: 'Revisar composição do squad ou contratos atribuídos'
                });
            }
            
            // Check squad utilization
            if (roi.contractCount === 0) {
                insights.push({
                    type: 'warning',
                    title: `Squad ${squad.name} sem contratos`,
                    message: `Squad com ${members.length} pessoas mas sem contratos atribuídos`,
                    action: 'Alocar contratos ou desmontar squad'
                });
            }
            
            // Check squad size efficiency
            if (members.length > 6 && roi.contractCount < 3) {
                insights.push({
                    type: 'info',
                    title: `Squad ${squad.name} pode estar grande demais`,
                    message: `${members.length} pessoas para apenas ${roi.contractCount} contrato(s)`,
                    action: 'Considerar dividir o squad ou alocar mais projetos'
                });
            }
        });
        
        return insights;
    }

    getTopOpportunities() {
        const opportunities = [];
        
        // High-margin contracts to replicate
        const contractRanking = analyticsService.getContractProfitabilityRanking();
        const topContracts = contractRanking.filter(c => c.margin > 40).slice(0, 3);
        
        if (topContracts.length > 0) {
            opportunities.push({
                type: 'success',
                title: 'Contratos modelo',
                message: `${topContracts.length} contrato(s) com margem excelente (>40%)`,
                items: topContracts.map(c => `${c.client}: ${c.margin.toFixed(1)}%`),
                action: 'Buscar clientes similares ou replicar modelo'
            });
        }
        
        // Most efficient people
        const ranking = analyticsService.getProductivityRanking();
        const topPerformers = ranking.slice(0, 3).filter(p => p.totalDeliverables > 0);
        
        if (topPerformers.length > 0) {
            opportunities.push({
                type: 'success',
                title: 'Top performers',
                message: 'Profissionais mais eficientes',
                items: topPerformers.map(p => `${p.name} (${p.role}): ${p.totalDeliverables} entregas`),
                action: 'Reconhecer e usar como benchmarks'
            });
        }
        
        return opportunities;
    }
}

export default new InsightsService();
