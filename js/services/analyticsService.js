// analyticsService.js - Analytics and ROI calculation service — v3
//
// MODELO DE CUSTO (substitui o sistema de pesos/pontos genéricos):
//
//   Cada contrato tem dois contadores: videoCount, staticCount.
//   Cada pessoa atribuída a um contrato está em um de dois modos:
//     - 'rateado': custo = (entregáveis relevantes da pessoa NESSE contrato
//                           ÷ total de entregáveis relevantes da pessoa em
//                             TODOS os contratos rateados) × salário da pessoa
//     - 'fixo':    custo = valor travado (fixedValue), não usa salário nem entra
//                          no total de entregáveis da pessoa
//
//   Qual entregável conta para cada função (rateio):
//     - Filmmaker            → conta apenas videoCount
//     - Designer             → conta apenas staticCount
//     - Copywriter e outros  → conta videoCount + staticCount
//
//   Head do squad: NÃO está em peopleAllocations. Custo automático,
//   rateado pelo volume (videoCount + staticCount) de cada cliente
//   dentro do squad — sem lançamento manual.

import storage from '../store/storage.js';

class AnalyticsService {

    // ========================================
    // REGRA: QUAL ENTREGÁVEL CONTA PARA CADA FUNÇÃO
    // ========================================

    _relevantQuantity(role, videoCount, staticCount) {
        const v = videoCount || 0;
        const s = staticCount || 0;
        if (role === 'Filmmaker') return v;
        if (role === 'Designer')  return s;
        return v + s;
    }

    // ========================================
    // PERÍODO — helpers de projeção
    // ========================================

    _getProjectionData(contract, periodId) {
        const projection = storage.getContractProjection(contract.id, periodId);
        if (projection) {
            return {
                value: projection.value || 0,
                videoCount: projection.videoCount || 0,
                staticCount: projection.staticCount || 0,
                peopleAllocations: projection.peopleAllocations || contract.peopleAllocations || []
            };
        }
        return {
            value: contract.value || 0,
            videoCount: contract.videoCount || 0,
            staticCount: contract.staticCount || 0,
            peopleAllocations: contract.peopleAllocations || []
        };
    }

    // ========================================
    // PESSOA — custo total
    // ========================================

    getPersonCost(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const person = storage.getPersonById(personId);
        if (!person) return 0;
        return storage.getSalaryForPeriod(personId, currentPeriod) || person.salary || 0;
    }

    getPersonContractsForPeriod(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);
        return activeContracts.filter(contract => {
            const data = this._getProjectionData(contract, currentPeriod);
            return data.peopleAllocations.some(a => a.personId === personId);
        });
    }

    getPersonContracts(personId) {
        return this.getPersonContractsForPeriod(personId);
    }

    getPersonTotalRateableDeliverables(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const person = storage.getPersonById(personId);
        if (!person) return 0;

        const contracts = this.getPersonContractsForPeriod(personId, currentPeriod);
        let total = 0;

        contracts.forEach(contract => {
            const data = this._getProjectionData(contract, currentPeriod);
            const alloc = data.peopleAllocations.find(a => a.personId === personId);
            if (!alloc || alloc.mode !== 'rateado') return;
            total += this._relevantQuantity(person.role, data.videoCount, data.staticCount);
        });

        return total;
    }

    getPersonCostInContract(personId, contractId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contract = storage.getContractById(contractId);
        const person = storage.getPersonById(personId);
        if (!contract || !person) return 0;

        const data = this._getProjectionData(contract, currentPeriod);
        const alloc = data.peopleAllocations.find(a => a.personId === personId);
        if (!alloc) return 0;

        if (alloc.mode === 'fixo') {
            return alloc.fixedValue || 0;
        }

        const relevantHere = this._relevantQuantity(person.role, data.videoCount, data.staticCount);
        if (relevantHere === 0) return 0;

        const totalRateable = this.getPersonTotalRateableDeliverables(personId, currentPeriod);
        if (totalRateable === 0) return 0;

        const salary = this.getPersonCost(personId, currentPeriod);
        return (relevantHere / totalRateable) * salary;
    }

    getPersonTotalAllocated(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contracts = this.getPersonContractsForPeriod(personId, currentPeriod);
        let total = 0;
        contracts.forEach(contract => {
            total += this.getPersonCostInContract(personId, contract.id, currentPeriod);
        });
        return total;
    }

    getSalaryReconciliation(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const people = storage.getPeople();

        return people.map(person => {
            const salary    = this.getPersonCost(person.id, currentPeriod);
            const allocated = this.getPersonTotalAllocated(person.id, currentPeriod);
            const hasFixedOnly = this._hasOnlyFixedAllocations(person.id, currentPeriod);
            const diff = salary - allocated;

            return {
                personId: person.id,
                name: person.name,
                role: person.role,
                salary,
                allocated,
                diff,
                isFixedOnly: hasFixedOnly,
                isOk: Math.abs(diff) < 0.01 || hasFixedOnly
            };
        });
    }

    _hasOnlyFixedAllocations(personId, periodId) {
        const contracts = this.getPersonContractsForPeriod(personId, periodId);
        if (contracts.length === 0) return false;
        return contracts.every(contract => {
            const data = this._getProjectionData(contract, periodId);
            const alloc = data.peopleAllocations.find(a => a.personId === personId);
            return alloc && alloc.mode === 'fixo';
        });
    }

    // ========================================
    // HEAD — custo automático por volume
    // ========================================

    _clientVolumeInSquad(squadId, clientName, periodId) {
        const activeContracts = storage.getActiveContractsForPeriod(periodId);
        const squadClientContracts = activeContracts.filter(c =>
            c.squadTag === squadId && c.client === clientName
        );
        return squadClientContracts.reduce((sum, c) => {
            const data = this._getProjectionData(c, periodId);
            return sum + (data.videoCount || 0) + (data.staticCount || 0);
        }, 0);
    }

    _totalVolumeInSquad(squadId, periodId) {
        const activeContracts = storage.getActiveContractsForPeriod(periodId);
        const squadContracts = activeContracts.filter(c => c.squadTag === squadId);
        return squadContracts.reduce((sum, c) => {
            const data = this._getProjectionData(c, periodId);
            return sum + (data.videoCount || 0) + (data.staticCount || 0);
        }, 0);
    }

    getHeadCostForContract(contractId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contract = storage.getContractById(contractId);
        if (!contract || !contract.squadTag) return 0;

        const squad = storage.getSquadById(contract.squadTag);
        if (!squad || !squad.headId) return 0;

        const headSalary = this.getPersonCost(squad.headId, currentPeriod);
        if (headSalary === 0) return 0;

        const totalVolume = this._totalVolumeInSquad(squad.id, currentPeriod);
        if (totalVolume === 0) return 0;

        const clientVolume = this._clientVolumeInSquad(squad.id, contract.client, currentPeriod);
        if (clientVolume === 0) return 0;

        const headCostForClient = headSalary * (clientVolume / totalVolume);

        const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);
        const clientContracts = activeContracts.filter(c =>
            c.squadTag === squad.id && c.client === contract.client
        );
        if (clientContracts.length <= 1) return headCostForClient;

        const data = this._getProjectionData(contract, currentPeriod);
        const thisContractVolume = (data.videoCount || 0) + (data.staticCount || 0);
        if (thisContractVolume === 0) return 0;

        return headCostForClient * (thisContractVolume / clientVolume);
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

        const data = this._getProjectionData(contract, currentPeriod);
        const revenue = data.value || 0;
        let cost = 0;
        const costBreakdown = [];

        data.peopleAllocations.forEach(alloc => {
            const person = storage.getPersonById(alloc.personId);
            if (!person) return;

            const personCost = this.getPersonCostInContract(alloc.personId, contractId, currentPeriod);
            if (personCost === 0 && alloc.mode === 'rateado') return;

            cost += personCost;

            if (alloc.mode === 'fixo') {
                costBreakdown.push({
                    personId: person.id,
                    name: person.name,
                    role: person.role,
                    mode: 'fixo',
                    totalCost: personCost
                });
            } else {
                const relevantHere = this._relevantQuantity(person.role, data.videoCount, data.staticCount);
                const totalRateable = this.getPersonTotalRateableDeliverables(person.id, currentPeriod);
                costBreakdown.push({
                    personId: person.id,
                    name: person.name,
                    role: person.role,
                    mode: 'rateado',
                    relevantHere,
                    totalRateable,
                    salary: this.getPersonCost(person.id, currentPeriod),
                    totalCost: personCost
                });
            }
        });

        const headCost = this.getHeadCostForContract(contractId, currentPeriod);
        if (headCost > 0) {
            cost += headCost;
            const squad = storage.getSquadById(contract.squadTag);
            if (squad && squad.headId) {
                const head = storage.getPersonById(squad.headId);
                if (head) {
                    costBreakdown.push({
                        personId: head.id,
                        name: head.name + ' (Head)',
                        role: head.role,
                        mode: 'head',
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
            videoCount: data.videoCount,
            staticCount: data.staticCount,
            costBreakdown
        };
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
        let totalCost = 0;

        contracts.forEach(contract => {
            const roi = this.getContractROI(contract.id, currentPeriod);
            totalRevenue += roi.revenue;
            totalCost += roi.cost;
        });

        return {
            revenue: totalRevenue,
            cost: totalCost,
            profit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
            contractCount: contracts.length
        };
    }

    // ========================================
    // DRE POR SQUAD
    // ========================================

    getSquadDRE(squadId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const squad = storage.getSquadById(squadId);
        if (!squad) return null;

        const contracts = this.getSquadContracts(squadId, currentPeriod);

        const revenuePerContract = contracts.map(contract => {
            const roi = this.getContractROI(contract.id, currentPeriod);
            return { contractId: contract.id, client: contract.client, value: roi.revenue };
        });
        const totalRevenue = revenuePerContract.reduce((s, c) => s + c.value, 0);

        const memberCostMap = {};
        contracts.forEach(contract => {
            const roi = this.getContractROI(contract.id, currentPeriod);
            roi.costBreakdown.forEach(item => {
                if (item.isHead) return;
                if (!memberCostMap[item.personId]) {
                    memberCostMap[item.personId] = { name: item.name, role: item.role, cost: 0 };
                }
                memberCostMap[item.personId].cost += item.totalCost;
            });
        });
        const memberCosts = Object.entries(memberCostMap).map(([personId, v]) => ({
            personId, name: v.name, role: v.role, cost: v.cost
        }));
        const totalMembersCost = memberCosts.reduce((s, m) => s + m.cost, 0);

        let totalHeadCost = 0;
        let headData = null;
        if (squad.headId) {
            const head = storage.getPersonById(squad.headId);
            contracts.forEach(contract => {
                totalHeadCost += this.getHeadCostForContract(contract.id, currentPeriod);
            });
            if (head) {
                headData = { personId: head.id, name: head.name, role: head.role, salary: head.salary, cost: totalHeadCost };
            }
        }

        const totalCost = totalMembersCost + totalHeadCost;
        const grossProfit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        return {
            squadId,
            squadName: squad.name,
            squadIcon: squad.icon || null,
            squadDescription: squad.description || '',
            revenue: { total: totalRevenue, perContract: revenuePerContract },
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
        return storage.getSquads().map(sq => this.getSquadDRE(sq.id, periodId));
    }

    // ========================================
    // ROI GERAL
    // ========================================

    getOverallROI(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);

        let totalRevenue = 0;
        let totalCost = 0;

        activeContracts.forEach(contract => {
            const roi = this.getContractROI(contract.id, currentPeriod);
            totalRevenue += roi.revenue;
            totalCost += roi.cost;
        });

        return {
            revenue: totalRevenue,
            cost: totalCost,
            profit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
        };
    }

    getMonthOverMonthComparison(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const [year, month] = currentPeriod.split('-').map(Number);
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear  = month === 1 ? year - 1 : year;
        const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        const current  = this.getOverallROI(currentPeriod);
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
    // PRODUTIVIDADE / RANKING
    // ========================================

    getPersonTotalDeliverables(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contracts = this.getPersonContractsForPeriod(personId, currentPeriod);
        let total = 0;
        contracts.forEach(contract => {
            const data = this._getProjectionData(contract, currentPeriod);
            total += (data.videoCount || 0) + (data.staticCount || 0);
        });
        return total;
    }

    getPersonAverageTicket(personId, periodId = null) {
        const contracts = this.getPersonContractsForPeriod(personId, periodId);
        if (contracts.length === 0) return 0;
        const currentPeriod = periodId || storage.getCurrentPeriod();
        let totalValue = 0;
        contracts.forEach(contract => {
            const data = this._getProjectionData(contract, currentPeriod);
            totalValue += data.value || 0;
        });
        return totalValue / contracts.length;
    }

    getProductivityRanking(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const people = storage.getPeople();

        return people.map(person => {
            const salary = this.getPersonCost(person.id, currentPeriod);
            const totalRateable = this.getPersonTotalRateableDeliverables(person.id, currentPeriod);
            const costPerDeliverable = totalRateable > 0 ? salary / totalRateable : 0;
            const contracts = this.getPersonContractsForPeriod(person.id, currentPeriod);

            return {
                id: person.id,
                name: person.name,
                role: person.role,
                salary,
                totalDeliverables: this.getPersonTotalDeliverables(person.id, currentPeriod),
                costPerDeliverable,
                contractCount: contracts.length,
                averageTicket: this.getPersonAverageTicket(person.id, currentPeriod)
            };
        });
    }

    getContractProfitabilityRanking(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contracts = storage.getActiveContractsForPeriod(currentPeriod);

        return contracts.map(contract => {
            const roi = this.getContractROI(contract.id, currentPeriod);
            return {
                id: contract.id,
                client: contract.client,
                revenue: roi.revenue,
                cost: roi.cost,
                profit: roi.profit,
                margin: roi.margin
            };
        }).sort((a, b) => b.profit - a.profit);
    }
}

export default new AnalyticsService();
