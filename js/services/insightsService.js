// insightsService.js - Insights automáticos com thresholds configuráveis.
// Todos os valores numéricos vêm de storage.getSettings().insights —
// a tela de Configurações permite ao usuário ajustá-los sem tocar no código.

import analyticsService from '../services/analyticsService.js';
import contractService from '../services/contractService.js';
import personService from '../services/personService.js';
import squadService from '../services/squadService.js';
import storage from '../store/storage.js';

// ── Defaults (usados quando o usuário ainda não configurou nada) ─────────

export const INSIGHT_DEFAULTS = {
    // Margem geral
    margemCritica:       20,   // abaixo disso → alerta crítico
    margemAtencao:       30,   // abaixo disso → aviso

    // Contratos individuais
    margemBaixa:         15,   // entre 0 e esse valor → aviso "margem baixa"
    margemModelo:        40,   // acima disso → oportunidade "contrato modelo"

    // Carga de trabalho (multiplicador vs média dos pares do mesmo cargo)
    cargaCritica:        2.0,  // 2x ou mais → alerta crítico "sobrecarregado"
    cargaAtencao:        1.5,  // 1.5x ou mais → aviso

    // Disparidade de custo/entrega entre pares do mesmo cargo (%)
    disparidadeCusto:    50,

    // Ponto único de falha: só 1 pessoa no cargo com mais de X contratos
    pontoUnicoContratos: 3,

    // Squad grande demais: mais de X pessoas com menos de Y contratos
    squadGrandeMax:      6,
    squadGrandeMinContr: 3,

    // Quantidade de contratos modelo a mostrar nas oportunidades
    topModeloQtd:        3,
};

function getThresholds() {
    const saved = (storage.getSettings() || {}).insights || {};
    return { ...INSIGHT_DEFAULTS, ...saved };
}

// ── Serviço ──────────────────────────────────────────────────────────────────

class InsightsService {
    generateAllInsights() {
        const insights = [];
        insights.push(...this.getProfitabilityInsights());
        insights.push(...this.getProductivityInsights());
        insights.push(...this.getResourceInsights());
        insights.push(...this.getSquadInsights());
        return insights.sort((a, b) => {
            const priority = { critical: 3, warning: 2, info: 1 };
            return (priority[b.type] || 0) - (priority[a.type] || 0);
        });
    }

    getProfitabilityInsights() {
        const t = getThresholds();
        const insights = [];
        const overallROI = analyticsService.getOverallROI();

        if (overallROI.margin < t.margemCritica) {
            insights.push({
                type: 'critical',
                title: 'Margem geral baixa',
                message: `A margem da operação está em ${overallROI.margin.toFixed(1)}%. Recomendado: acima de ${t.margemAtencao}%.`,
                action: 'Revisar contratos menos lucrativos ou renegociar valores'
            });
        } else if (overallROI.margin < t.margemAtencao) {
            insights.push({
                type: 'warning',
                title: 'Margem pode melhorar',
                message: `Margem atual: ${overallROI.margin.toFixed(1)}%. Há espaço para otimização.`,
                action: 'Analisar oportunidades de redução de custos'
            });
        }

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

        const lowMarginContracts = contractRanking.filter(c => c.margin > 0 && c.margin < t.margemBaixa);
        if (lowMarginContracts.length > 0) {
            insights.push({
                type: 'warning',
                title: `${lowMarginContracts.length} contrato(s) com margem baixa`,
                message: `Contratos com margem < ${t.margemBaixa}%: ${lowMarginContracts.map(c => c.client).join(', ')}`,
                action: 'Avaliar possibilidade de otimização ou reajuste'
            });
        }

        return insights;
    }

    getProductivityInsights() {
        const t = getThresholds();
        const insights = [];
        const people = personService.getAllPeople();

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

        const roles = personService.getAllRoles();
        roles.forEach(role => {
            const profiles = personService.getPeopleByRole(role)
                .map(person => ({ person, profile: analyticsService.getPersonDeliveryProfile(person.id) }))
                .filter(x => x.profile.total > 0);
            if (profiles.length < 2) return;

            profiles.forEach(({ person, profile }) => {
                const others = profiles.filter(x => x.person.id !== person.id);
                const othersAvg = others.reduce((s, x) => s + x.profile.total, 0) / others.length;
                if (othersAvg === 0) return;

                const ratio = profile.total / othersAvg;
                const unitLabel = profile.kind === 'head' ? 'clientes' : profile.kind === 'traffic' ? 'contratos de tráfego' : 'entregas mensais';
                const pctAbove = Math.round((ratio - 1) * 100);

                if (ratio >= t.cargaCritica) {
                    insights.push({
                        type: 'critical',
                        title: `${person.name} pode estar sobrecarregado(a)`,
                        message: `${profile.total} ${unitLabel} — ${pctAbove}% acima da média dos demais ${role} (${othersAvg.toFixed(0)})`,
                        action: 'Redistribuir trabalho entre os pares de cargo ou contratar suporte'
                    });
                } else if (ratio >= t.cargaAtencao) {
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
        const t = getThresholds();
        const insights = [];
        const roles = personService.getAllRoles();

        roles.forEach(role => {
            const peopleInRole = personService.getPeopleByRole(role);
            const totalContracts = contractService.getAllContracts().length;

            if (peopleInRole.length === 1 && totalContracts > t.pontoUnicoContratos) {
                insights.push({
                    type: 'warning',
                    title: `Ponto único de falha: ${role}`,
                    message: `Apenas 1 ${role} para ${totalContracts} contratos`,
                    action: 'Considerar contratar backup ou freelancer'
                });
            }

            const comparison = analyticsService.comparePeopleByRole(role);
            if (comparison.length >= 2) {
                const costs = comparison.map(p => p.costPerDeliverable).filter(c => c > 0);
                if (costs.length >= 2) {
                    const maxCost = Math.max(...costs);
                    const minCost = Math.min(...costs);
                    const disparity = (maxCost / minCost - 1) * 100;
                    if (disparity > t.disparidadeCusto) {
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
        const t = getThresholds();
        const insights = [];
        const squads = squadService.getAllSquads();

        squads.forEach(squad => {
            const roi = analyticsService.getSquadROI(squad.id);
            const members = squadService.getSquadMembers(squad.id);
            const engagementCount = (roi.contractCount || 0) + (roi.projectCount || 0);

            if (roi.profit < 0) {
                insights.push({
                    type: 'critical',
                    title: `Squad ${squad.name} no prejuízo`,
                    message: `Prejuízo de R$ ${Math.abs(roi.profit).toLocaleString('pt-BR')}`,
                    action: 'Revisar composição do squad ou contratos atribuídos'
                });
            }

            if (engagementCount === 0) {
                insights.push({
                    type: 'warning',
                    title: `Squad ${squad.name} sem contratos`,
                    message: `Squad com ${members.length} pessoas mas sem contratos ou projetos atribuídos`,
                    action: 'Alocar contratos ou desmontar squad'
                });
            }

            if (members.length > t.squadGrandeMax && engagementCount < t.squadGrandeMinContr) {
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
        const t = getThresholds();
        const opportunities = [];

        const contractRanking = analyticsService.getEngagementProfitabilityRanking();
        const topContracts = contractRanking.filter(c => c.margin > t.margemModelo).slice(0, t.topModeloQtd);

        if (topContracts.length > 0) {
            opportunities.push({
                type: 'success',
                title: 'Contratos modelo',
                message: `${topContracts.length} contrato(s) com margem excelente (>${t.margemModelo}%)`,
                items: topContracts.map(c => `${c.client}: ${c.margin.toFixed(1)}%`),
                action: 'Buscar clientes similares ou replicar modelo'
            });
        }

        const roles = personService.getAllRoles();
        const bestPerRole = [];
        roles.forEach(role => {
            const comparison = analyticsService.comparePeopleByRole(role).filter(p => p.costPerDeliverable > 0);
            if (comparison.length < 2) return;
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
