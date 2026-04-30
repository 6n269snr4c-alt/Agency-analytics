// analyticsService.js - Analytics and ROI calculation service
// VERSÃO COM SISTEMA MENSAL + HEAD POR CLIENTE + DRE POR SQUAD (rateio por entregáveis)

import storage from '../store/storage.js';

class AnalyticsService {

    // ========================================
    // SISTEMA DE PESOS
    // ========================================

    getWeightForRole(roleName, deliverableTypeId) {
        const roles = storage.getRoles() || [];
        const role = roles.find(r => r.name === roleName);

        if (role && role.deliverableWeights && role.deliverableWeights[deliverableTypeId]) {
            return role.deliverableWeights[deliverableTypeId];
        }

        const deliverableType = storage.getDeliverableTypeById(deliverableTypeId);
        return (deliverableType && deliverableType.defaultWeight) || 1;
    }

    getPersonTotalWeightedDeliverables(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contracts = this.getPersonContractsForPeriod(personId, currentPeriod);
        const person = storage.getPersonById(personId);

        if (!person) return 0;

        let totalWeightedPoints = 0;

        contracts.forEach(contract => {
            const projection = storage.getContractProjection(contract.id, currentPeriod);
            const deliverables = projection ? projection.deliverables : contract.deliverables;

            if (deliverables) {
                Object.entries(deliverables).forEach(([typeId, quantity]) => {
                    const weight = this.getWeightForRole(person.role, typeId);
                    totalWeightedPoints += (quantity * weight);
                });
            }
        });

        return totalWeightedPoints;
    }

    /**
     * Retorna os pontos ponderados que uma pessoa gera dentro de um squad específico.
     * Usado para calcular o rateio de custo quando a pessoa está em múltiplos squads.
     *
     * Lógica: soma os pontos ponderados (qty × peso) de todos os contratos daquele squad
     * onde a pessoa está em assignedPeople e os entregáveis batem com o cargo dela.
     */
    getPersonWeightedDeliverablesInSquad(personId, squadId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const person = storage.getPersonById(personId);
        if (!person) return 0;

        const squadContracts = this.getSquadContracts(squadId, currentPeriod);
        // Considera apenas contratos onde a pessoa está atribuída
        const personContracts = squadContracts.filter(c =>
            c.assignedPeople && c.assignedPeople.includes(personId)
        );

        let points = 0;
        personContracts.forEach(contract => {
            const projection = storage.getContractProjection(contract.id, currentPeriod);
            const deliverables = projection ? projection.deliverables : contract.deliverables;

            if (deliverables) {
                Object.entries(deliverables).forEach(([typeId, quantity]) => {
                    // Conta apenas entregáveis cujo tipo inclui o cargo desta pessoa
                    const type = storage.getDeliverableTypeById(typeId);
                    if (type && type.roles && type.roles.includes(person.role)) {
                        const weight = this.getWeightForRole(person.role, typeId);
                        points += quantity * weight;
                    }
                });
            }
        });

        return points;
    }

    /**
     * Calcula o custo alocado de uma pessoa em um squad específico,
     * rateado pela proporção de pontos ponderados naquele squad
     * em relação ao total de pontos da pessoa em todos os squads.
     *
     * Se a pessoa não tiver entregáveis mapeados em nenhum squad (dados ausentes),
     * cai no fallback de divisão igual (1/N squads) para não zerar o custo.
     */
    getPersonAllocatedCostInSquad(personId, squadId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const fullSalary = this.getPersonCost(personId, currentPeriod);

        const allSquads = storage.getSquads().filter(sq => sq.members.includes(personId));
        if (allSquads.length <= 1) return fullSalary; // único squad: 100%

        // Soma pontos em cada squad onde é membro
        let totalPoints = 0;
        const pointsPerSquad = {};
        allSquads.forEach(sq => {
            const pts = this.getPersonWeightedDeliverablesInSquad(personId, sq.id, currentPeriod);
            pointsPerSquad[sq.id] = pts;
            totalPoints += pts;
        });

        // Fallback: sem entregáveis mapeados → divisão igual
        if (totalPoints === 0) {
            return fullSalary / allSquads.length;
        }

        const fraction = (pointsPerSquad[squadId] || 0) / totalPoints;
        return fullSalary * fraction;
    }

    // ========================================
    // HEAD EXECUTIVO - CUSTO POR CLIENTE
    // ========================================

    getHeadCostForContract(contractId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contract = storage.getContractById(contractId);
        if (!contract || !contract.squadTag) return 0;

        const squad = storage.getSquadById(contract.squadTag);
        if (!squad || !squad.headId) return 0;

        const head = storage.getPersonById(squad.headId);
        if (!head) return 0;

        const headSalary = storage.getSalaryForPeriod(squad.headId, currentPeriod) || head.salary || 0;

        const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);
        const squadContracts = activeContracts.filter(c => c.squadTag === squad.id);
        const uniqueClients = [...new Set(squadContracts.map(c => c.client))];
        const clientCount = uniqueClients.length;

        if (clientCount === 0) return 0;
        return headSalary / clientCount;
    }

    // ========================================
    // ROI DO CONTRATO
    // ========================================

    getContractROI(contractId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contract = storage.getContractById(contractId);

        if (!contract) {
            return { revenue: 0, cost: 0, profit: 0, margin: 0, costBreakdown: [] };
        }

        const projection = storage.getContractProjection(contractId, currentPeriod);
        if (!projection) {
            return { revenue: 0, cost: 0, profit: 0, margin: 0, costBreakdown: [] };
        }

        const revenue = projection.value || 0;
        const deliverables = projection.deliverables || {};
        let cost = 0;
        const costBreakdown = [];

        // 1. Custo das pessoas (exceto Head)
        if (contract.assignedPeople && contract.assignedPeople.length > 0) {
            contract.assignedPeople.forEach(personId => {
                const person = storage.getPersonById(personId);
                if (!person) return;

                const squad = storage.getSquadById(contract.squadTag);
                if (squad && squad.headId === personId) return;

                let personWeightedPointsInContract = 0;

                if (deliverables) {
                    Object.entries(deliverables).forEach(([typeId, quantity]) => {
                        const weight = this.getWeightForRole(person.role, typeId);
                        personWeightedPointsInContract += (quantity * weight);
                    });
                }

                const totalPersonWeightedPoints = this.getPersonTotalWeightedDeliverables(personId, currentPeriod);
                const personSalary = storage.getSalaryForPeriod(personId, currentPeriod) || person.salary || 0;
                const costPerWeightedPoint = totalPersonWeightedPoints > 0
                    ? personSalary / totalPersonWeightedPoints
                    : 0;
                const personCostInContract = personWeightedPointsInContract * costPerWeightedPoint;
                cost += personCostInContract;

                if (personWeightedPointsInContract > 0) {
                    costBreakdown.push({
                        personId: person.id,
                        name: person.name,
                        role: person.role,
                        salary: personSalary,
                        costPerWeightedPoint,
                        weightedPointsInContract: personWeightedPointsInContract,
                        totalCost: personCostInContract
                    });
                }
            });
        }

        // 2. Custo do Head (por cliente)
        const headCost = this.getHeadCostForContract(contractId, currentPeriod);

        if (headCost > 0) {
            cost += headCost;
            const squad = storage.getSquadById(contract.squadTag);
            if (squad && squad.headId) {
                const head = storage.getPersonById(squad.headId);
                if (head) {
                    costBreakdown.push({
                        personId: head.id,
                        name: head.name + ' (Head - Estratégia)',
                        role: head.role,
                        salary: storage.getSalaryForPeriod(squad.headId, currentPeriod) || head.salary || 0,
                        costPerWeightedPoint: 0,
                        weightedPointsInContract: 0,
                        totalCost: headCost,
                        isHead: true
                    });
                }
            }
        }

        return {
            revenue,
            cost,
            profit: revenue - cost,
            margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
            costBreakdown
        };
    }

    // ========================================
    // FUNÇÕES AUXILIARES
    // ========================================

    getPersonCost(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const person = storage.getPersonById(personId);
        if (!person) return 0;
        return storage.getSalaryForPeriod(personId, currentPeriod) || person.salary || 0;
    }

    getPersonTotalDeliverables(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contracts = this.getPersonContractsForPeriod(personId, currentPeriod);
        const person = storage.getPersonById(personId);
        if (!person) return 0;

        let total = 0;
        contracts.forEach(contract => {
            const projection = storage.getContractProjection(contract.id, currentPeriod);
            const deliverables = projection ? projection.deliverables : contract.deliverables;
            if (deliverables) {
                Object.values(deliverables).forEach(qty => { total += qty; });
            }
        });
        return total;
    }

    getPersonCostPerDeliverable(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const totalWeightedPoints = this.getPersonTotalWeightedDeliverables(personId, currentPeriod);
        const personSalary = this.getPersonCost(personId, currentPeriod);
        if (totalWeightedPoints === 0) return 0;
        return personSalary / totalWeightedPoints;
    }

    getPersonContractsForPeriod(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);
        return activeContracts.filter(contract =>
            contract.assignedPeople && contract.assignedPeople.includes(personId)
        );
    }

    // Manter compatibilidade
    getPersonContracts(personId) {
        return this.getPersonContractsForPeriod(personId);
    }

    getPersonAverageTicket(personId, periodId = null) {
        const contracts = this.getPersonContractsForPeriod(personId, periodId);
        if (contracts.length === 0) return 0;
        const currentPeriod = periodId || storage.getCurrentPeriod();
        let totalValue = 0;
        contracts.forEach(contract => {
            const projection = storage.getContractProjection(contract.id, currentPeriod);
            totalValue += projection ? projection.value : contract.value;
        });
        return totalValue / contracts.length;
    }

    // Mantido para compatibilidade com código legado
    getPersonProratedCostBySquad(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const squads = storage.getSquads().filter(sq => sq.members.includes(personId));
        const personSalary = this.getPersonCost(personId, currentPeriod);
        if (squads.length === 0) return {};

        const costs = {};
        squads.forEach(sq => {
            costs[sq.id] = this.getPersonAllocatedCostInSquad(personId, sq.id, currentPeriod);
        });
        return costs;
    }

    // ========================================
    // SQUADS
    // ========================================

    getSquadContracts(squadId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);
        return activeContracts.filter(contract => contract.squadTag === squadId);
    }

    getSquadROI(squadId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contracts = this.getSquadContracts(squadId, currentPeriod);
        const squad = storage.getSquadById(squadId);

        if (!squad) {
            return { revenue: 0, cost: 0, profit: 0, margin: 0, contractCount: 0 };
        }

        let totalRevenue = 0;
        contracts.forEach(contract => {
            const projection = storage.getContractProjection(contract.id, currentPeriod);
            totalRevenue += projection ? projection.value : 0;
        });

        // Custo dos membros com rateio por entregáveis
        let membersCost = 0;
        squad.members.forEach(personId => {
            if (squad.headId === personId) return;
            membersCost += this.getPersonAllocatedCostInSquad(personId, squadId, currentPeriod);
        });

        // Custo do Head (100% alocado neste squad)
        let headCost = 0;
        if (squad.headId) {
            headCost = this.getPersonCost(squad.headId, currentPeriod);
        }

        const totalCost = membersCost + headCost;

        return {
            revenue: totalRevenue,
            cost: totalCost,
            profit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
            contractCount: contracts.length
        };
    }

    // ========================================
    // DRE POR SQUAD (rateio por entregáveis ponderados)
    // ========================================

    /**
     * Retorna o DRE completo de um squad para o período informado.
     *
     * Rateio de pessoas compartilhadas (em múltiplos squads):
     *   custo_alocado = salário × (pontos_ponderados_neste_squad / pontos_totais_da_pessoa)
     *   Fallback: divisão igual (1/N) se não houver entregáveis mapeados.
     *
     * Head: sempre 100% alocado no squad onde é head, sem rateio.
     */
    getSquadDRE(squadId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const squad = storage.getSquadById(squadId);
        if (!squad) return null;

        // ── Receita ──────────────────────────────────────────────────────────
        const contracts = this.getSquadContracts(squadId, currentPeriod);
        const revenuePerContract = contracts.map(contract => {
            const projection = storage.getContractProjection(contract.id, currentPeriod);
            return {
                contractId: contract.id,
                client: contract.client,
                value: projection ? projection.value : 0,
                deliverables: projection ? projection.deliverables : contract.deliverables
            };
        });
        const totalRevenue = revenuePerContract.reduce((s, c) => s + c.value, 0);

        // ── Mapeamento de pontos por pessoa (para mostrar na UI) ─────────────
        const allSquads = storage.getSquads();
        const squadCountByPerson = {};
        allSquads.forEach(sq => {
            sq.members.forEach(pId => {
                if (!squadCountByPerson[pId]) squadCountByPerson[pId] = 0;
                squadCountByPerson[pId]++;
            });
        });

        // ── Custos de membros ────────────────────────────────────────────────
        const memberCosts = [];
        squad.members.forEach(personId => {
            if (personId === squad.headId) return;

            const person = storage.getPersonById(personId);
            if (!person) return;

            const fullSalary = this.getPersonCost(personId, currentPeriod);
            const squadsCount = squadCountByPerson[personId] || 1;
            const isShared = squadsCount > 1;

            // Pontos ponderados desta pessoa neste squad
            const pointsHere = this.getPersonWeightedDeliverablesInSquad(personId, squadId, currentPeriod);

            // Pontos totais em todos os squads
            let pointsTotal = 0;
            if (isShared) {
                allSquads
                    .filter(sq => sq.members.includes(personId))
                    .forEach(sq => {
                        pointsTotal += this.getPersonWeightedDeliverablesInSquad(personId, sq.id, currentPeriod);
                    });
            }

            const allocatedCost = this.getPersonAllocatedCostInSquad(personId, squadId, currentPeriod);

            // Percentual real alocado
            const allocationPct = fullSalary > 0 ? (allocatedCost / fullSalary) * 100 : 0;

            // Método de rateio: por entregáveis ou por divisão igual (fallback)
            const allocationMethod = isShared
                ? (pointsTotal > 0 ? 'deliverables' : 'equal')
                : 'full';

            memberCosts.push({
                personId,
                name: person.name,
                role: person.role,
                fullSalary,
                squadsCount,
                allocatedCost,
                allocationPct,
                pointsHere,
                pointsTotal,
                isShared,
                allocationMethod
            });
        });

        const totalMembersCost = memberCosts.reduce((s, m) => s + m.allocatedCost, 0);

        // ── Custo do Head ────────────────────────────────────────────────────
        let headData = null;
        if (squad.headId) {
            const head = storage.getPersonById(squad.headId);
            if (head) {
                headData = {
                    personId: squad.headId,
                    name: head.name,
                    role: head.role,
                    salary: this.getPersonCost(squad.headId, currentPeriod)
                };
            }
        }

        const totalHeadCost = headData ? headData.salary : 0;
        const totalCost = totalMembersCost + totalHeadCost;
        const grossProfit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        return {
            squadId,
            squadName: squad.name,
            squadIcon: squad.icon || null,
            squadDescription: squad.description || '',
            revenue: {
                total: totalRevenue,
                perContract: revenuePerContract
            },
            costs: {
                total: totalCost,
                members: memberCosts,
                totalMembers: totalMembersCost,
                head: headData,
                totalHead: totalHeadCost
            },
            grossProfit,
            margin,
            contractCount: contracts.length,
            memberCount: squad.members.length
        };
    }

    getAllSquadsDRE(periodId = null) {
        const squads = storage.getSquads();
        return squads.map(sq => this.getSquadDRE(sq.id, periodId));
    }

    // ========================================
    // ROI GERAL
    // ========================================

    getOverallROI(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);
        const activeSalaries = storage.getSalariesForPeriod(currentPeriod);

        let totalRevenue = 0;
        activeContracts.forEach(contract => {
            const projection = storage.getContractProjection(contract.id, currentPeriod);
            totalRevenue += projection ? projection.value : 0;
        });

        const totalCost = activeSalaries.reduce((sum, entry) => sum + entry.salary, 0);

        return {
            revenue: totalRevenue,
            cost: totalCost,
            profit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
        };
    }

    // ========================================
    // COMPARAÇÃO MENSAL
    // ========================================

    getMonthlyEvolution(months = 6) {
        const currentPeriod = storage.getCurrentPeriod();
        const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
        const evolution = [];

        for (let i = months - 1; i >= 0; i--) {
            let month = currentMonth - i;
            let year = currentYear;
            while (month < 1) { month += 12; year--; }
            const periodId = `${year}-${String(month).padStart(2, '0')}`;
            const roi = this.getOverallROI(periodId);
            evolution.push({ periodId, label: this.getPeriodLabel(periodId), ...roi });
        }

        return evolution;
    }

    getPeriodLabel(periodId) {
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const [year, month] = periodId.split('-').map(Number);
        return `${monthNames[month - 1]}/${year}`;
    }

    compareWithPreviousMonth(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const [year, month] = currentPeriod.split('-').map(Number);
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        const current = this.getOverallROI(currentPeriod);
        const previous = this.getOverallROI(previousPeriod);

        return {
            current,
            previous,
            changes: {
                revenue: current.revenue - previous.revenue,
                revenuePercent: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
                cost: current.cost - previous.cost,
                costPercent: previous.cost > 0 ? ((current.cost - previous.cost) / previous.cost) * 100 : 0,
                profit: current.profit - previous.profit,
                margin: current.margin - previous.margin
            }
        };
    }

    // ========================================
    // RANKING E COMPARAÇÃO
    // ========================================

    getProductivityRanking(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const people = storage.getPeople();
        const activeSalaries = storage.getSalariesForPeriod(currentPeriod);

        return people.map(person => {
            const salaryEntry = activeSalaries.find(s => s.personId === person.id);
            const salary = salaryEntry ? salaryEntry.salary : 0;
            const totalWeightedPoints = this.getPersonTotalWeightedDeliverables(person.id, currentPeriod);
            const costPerPoint = totalWeightedPoints > 0 ? salary / totalWeightedPoints : 0;
            const contracts = this.getPersonContractsForPeriod(person.id, currentPeriod);

            return {
                id: person.id,
                name: person.name,
                role: person.role,
                salary,
                totalWeightedPoints,
                costPerPoint,
                contractCount: contracts.length,
                efficiency: totalWeightedPoints > 0 ? salary / totalWeightedPoints : 0
            };
        }).sort((a, b) => a.costPerPoint - b.costPerPoint);
    }

    getSquadComparison(periodId = null) {
        const squads = storage.getSquads();
        return squads.map(squad => {
            const roi = this.getSquadROI(squad.id, periodId);
            return {
                id: squad.id,
                name: squad.name,
                icon: squad.icon,
                ...roi,
                memberCount: squad.members.length
            };
        });
    }

    getContractProfitabilityRanking(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);

        return activeContracts.map(contract => {
            const roi = this.getContractROI(contract.id, currentPeriod);
            return { id: contract.id, client: contract.client, ...roi };
        }).sort((a, b) => b.margin - a.margin);
    }

    getDeliverablesBreakdown(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);
        const breakdown = {};

        activeContracts.forEach(contract => {
            const projection = storage.getContractProjection(contract.id, currentPeriod);
            const deliverables = projection ? projection.deliverables : contract.deliverables;

            if (deliverables) {
                Object.entries(deliverables).forEach(([typeId, qty]) => {
                    const type = storage.getDeliverableTypeById(typeId);
                    const name = type ? type.name : typeId;
                    if (!breakdown[name]) breakdown[name] = 0;
                    breakdown[name] += qty;
                });
            }
        });

        return breakdown;
    }

    getRoleComparison(role, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const people = storage.getPeople().filter(p => p.role === role);
        const activeSalaries = storage.getSalariesForPeriod(currentPeriod);

        return people.map(person => {
            const salaryEntry = activeSalaries.find(s => s.personId === person.id);
            const salary = salaryEntry ? salaryEntry.salary : 0;
            const totalWeightedPoints = this.getPersonTotalWeightedDeliverables(person.id, currentPeriod);
            const costPerDeliverable = totalWeightedPoints > 0 ? salary / totalWeightedPoints : 0;
            const contracts = this.getPersonContractsForPeriod(person.id, currentPeriod);

            return {
                id: person.id,
                name: person.name,
                role: person.role,
                salary,
                totalDeliverables: totalWeightedPoints,
                costPerDeliverable,
                contractCount: contracts.length
            };
        });
    }

    getPersonDeliverablesBreakdown(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const person = storage.getPersonById(personId);
        if (!person) return { total: 0, byType: {}, byContract: {} };

        const contracts = this.getPersonContractsForPeriod(personId, currentPeriod);
        const breakdown = { total: 0, byType: {}, byContract: {} };

        contracts.forEach(contract => {
            const projection = storage.getContractProjection(contract.id, currentPeriod);
            const deliverables = projection ? projection.deliverables : contract.deliverables;

            if (!deliverables) return;

            let contractTotal = 0;
            const contractBreakdown = {};

            Object.entries(deliverables).forEach(([typeId, quantity]) => {
                const type = storage.getDeliverableTypeById(typeId);

                if (type && type.roles && type.roles.includes(person.role)) {
                    if (!breakdown.byType[type.name]) breakdown.byType[type.name] = 0;
                    breakdown.byType[type.name] += quantity;
                    breakdown.total += quantity;
                    contractTotal += quantity;
                    contractBreakdown[type.name] = quantity;
                }
            });

            if (contractTotal > 0) {
                breakdown.byContract[contract.client] = {
                    total: contractTotal,
                    breakdown: contractBreakdown
                };
            }
        });

        return breakdown;
    }
}

export default new AnalyticsService();
