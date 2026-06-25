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
        const contractRanking = analyticsService.getEngagementProfitabilityRanking();
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

        // "Sem contratos" — não depende de comparação entre cargos, fica igual.
        people.forEach(person => {
            const profile = analyticsService.getPersonDeliveryProfile(person.id);
            if (profile.contractCount === 0) {
                insights.push({
                    type: 'warning',
                    title: `${person.name} sem contratos`,
                    message: `${person.role} não está atribuído(a) a nenhum contrato${profile.kind === 'head' ? ' (squad sem clientes neste mês)' : ''}`,
                    action: 'Alocar em projetos ou revisar necessidade da posição'
                });
            }
        });

        // Carga de trabalho — comparada só ENTRE PARES DO MESMO CARGO. A
        // unidade de "entrega" muda de cargo pra cargo (Copywriter conta
        // vídeo+estático juntos, Filmmaker só vídeo, Designer só estático),
        // então um limite absoluto igual pra todos sempre acusava quem conta
        // mais coisas — não quem está, de fato, mais carregado que os pares.
        const roles = personService.getAllRoles();
        roles.forEach(role => {
            const profiles = personService.getPeopleByRole(role)
                .map(person => ({ person, profile: analyticsService.getPersonDeliveryProfile(person.id) }))
                .filter(x => x.profile.total > 0);

            if (profiles.length < 2) return; // sem par do mesmo cargo, não dá pra comparar

            profiles.forEach(({ person, profile }) => {
                // Média dos OUTROS pares do mesmo cargo — não do grupo todo
                // incluindo a própria pessoa, que amorteceria a diferença
                // (com só 2 pessoas no cargo, isso quase nunca disparava).
                const others = profiles.filter(x => x.person.id !== person.id);
                const othersAvg = others.reduce((s, x) => s + x.profile.total, 0) / others.length;
                if (othersAvg === 0) return;

                const ratio = profile.total / othersAvg;
                const unitLabel = profile.kind === 'head' ? 'clientes' : profile.kind === 'traffic' ? 'contratos de tráfego' : 'entregas mensais';
                const pctAbove = Math.round((ratio - 1) * 100);

                if (ratio >= 2) {
                    insights.push({
                        type: 'critical',
                        title: `${person.name} pode estar sobrecarregado(a)`,
                        message: `${profile.total} ${unitLabel} — ${pctAbove}% acima da média dos demais ${role} (${othersAvg.toFixed(0)})`,
                        action: 'Redistribuir trabalho entre os pares de cargo ou contratar suporte'
                    });
                } else if (ratio >= 1.5) {
                    insights.push({
                        type: 'warning',
                        title: `${person.name} com carga acima da média do cargo`,
                        message: `${profile.total} ${unitLabel} — ${pctAbove}% acima da média dos demais ${role} (${othersAvg.toFixed(0)})`,
                        action: 'Avaliar redistribuição entre os pares de cargo'
                    });
                }
            });
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
            const engagementCount = (roi.contractCount || 0) + (roi.projectCount || 0);
            
            // Check squad profitability
            if (roi.profit < 0) {
                insights.push({
                    type: 'critical',
                    title: `Squad ${squad.name} no prejuízo`,
                    message: `Prejuízo de R$ ${Math.abs(roi.profit).toLocaleString('pt-BR')}`,
                    action: 'Revisar composição do squad ou contratos atribuídos'
                });
            }
            
            // Check squad utilization (contratos + projetos pontuais juntos)
            if (engagementCount === 0) {
                insights.push({
                    type: 'warning',
                    title: `Squad ${squad.name} sem contratos`,
                    message: `Squad com ${members.length} pessoas mas sem contratos ou projetos atribuídos`,
                    action: 'Alocar contratos ou desmontar squad'
                });
            }
            
            // Check squad size efficiency
            if (members.length > 6 && engagementCount < 3) {
                insights.push({
                    type: 'info',
                    title: `Squad ${squad.name} pode estar grande demais`,
                    message: `${members.length} pessoas para apenas ${engagementCount} contrato(s)/projeto(s)`,
                    action: 'Considerar dividir o squad ou alocar mais projetos'
                });
            }
        });
        
        return insights;
    }

    getTopOpportunities() {
        const opportunities = [];
        
        // High-margin contracts to replicate
        const contractRanking = analyticsService.getEngagementProfitabilityRanking();
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
        
        // Most efficient person — escolhido DENTRO de cada cargo, nunca entre
        // cargos diferentes (custo/entrega de Copy e de Filmmaker não são a
        // mesma unidade, então comparar os dois lado a lado não tem sentido).
        const roles = personService.getAllRoles();
        const bestPerRole = [];
        roles.forEach(role => {
            const comparison = analyticsService.comparePeopleByRole(role).filter(p => p.costPerDeliverable > 0);
            if (comparison.length < 2) return; // só vale "melhor" se teve com quem comparar
            const best = [...comparison].sort((a, b) => a.costPerDeliverable - b.costPerDeliverable)[0];
            bestPerRole.push(best);
        });

        if (bestPerRole.length > 0) {
            const unitLabel = (p) => p.deliveryKind === 'head' ? 'cliente' : p.deliveryKind === 'traffic' ? 'contrato de tráfego' : 'entrega';
            opportunities.push({
                type: 'success',
                title: 'Top performers (dentro do próprio cargo)',
                message: 'Profissional mais eficiente em cada função, comparado só com os pares dela',
                items: bestPerRole.map(p => `${p.name} (${p.role}): R$ ${p.costPerDeliverable.toFixed(2)}/${unitLabel(p)}`),
                action: 'Reconhecer e usar como benchmarks'
            });
        }
        
        return opportunities;
    }
}

export default new InsightsService();
