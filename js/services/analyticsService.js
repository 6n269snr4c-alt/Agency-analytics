// analyticsService.js - VERSÃO CORRIGIDA COM SISTEMA DE PESOS

import storage from '../store/storage.js';

class AnalyticsService {
    
    // ========================================
    // SISTEMA DE PESOS - FUNÇÕES AUXILIARES
    // ========================================
    
    /**
     * Busca o peso configurado para um tipo de entregável em uma função específica
     * @param {string} roleName - Nome da função (ex: "Filmmaker")
     * @param {string} deliverableTypeId - ID do tipo de entregável
     * @returns {number} - Peso configurado ou peso padrão
     */
    getWeightForRole(roleName, deliverableTypeId) {
        const roles = storage.getRoles() || [];
        const role = roles.find(r => r.name === roleName);
        
        if (role && role.deliverableWeights && role.deliverableWeights[deliverableTypeId]) {
            return role.deliverableWeights[deliverableTypeId];
        }
        
        // Se não houver peso configurado, usar peso padrão do tipo
        const deliverableType = storage.getDeliverableTypeById(deliverableTypeId);
        return (deliverableType && deliverableType.defaultWeight) || 1;
    }

    /**
     * Calcula total de pontos ponderados dos entregáveis de uma pessoa
     * @param {string} personId - ID da pessoa
     * @returns {number} - Total de pontos ponderados
     */
    getPersonTotalWeightedDeliverables(personId) {
        const person = storage.getPersonById(personId);
        if (!person || !person.deliverables) return 0;

        let totalWeightedPoints = 0;

        Object.entries(person.deliverables).forEach(([typeId, quantity]) => {
            const weight = this.getWeightForRole(person.role, typeId);
            totalWeightedPoints += (quantity * weight);
        });

        return totalWeightedPoints;
    }

    // ========================================
    // CÁLCULO DE ROI DO CONTRATO (CORRIGIDO)
    // ========================================
    
    getContractROI(contractId) {
        const contract = storage.getContractById(contractId);
        if (!contract) {
            return {
                revenue: 0,
                cost: 0,
                profit: 0,
                margin: 0,
                costBreakdown: []
            };
        }

        const revenue = contract.value;
        let cost = 0;
        const costBreakdown = [];

        if (contract.assignedPeople && contract.assignedPeople.length > 0) {
            contract.assignedPeople.forEach(personId => {
                const person = storage.getPersonById(personId);
                if (!person) return;

                // ✅ CORREÇÃO: Contar entregáveis com PESOS
                let personWeightedPointsInContract = 0;
                
                if (contract.deliverables) {
                    Object.entries(contract.deliverables).forEach(([typeId, quantity]) => {
                        const type = storage.getDeliverableTypeById(typeId);
                        
                        // Só conta se a role da pessoa está no tipo de entregável
                        if (type && type.roles && type.roles.includes(person.role)) {
                            // ✅ USA PESO!
                            const weight = this.getWeightForRole(person.role, typeId);
                            personWeightedPointsInContract += (quantity * weight);
                        }
                    });
                }

                // Calcular custo por ponto ponderado desta pessoa
                const totalPersonWeightedPoints = this.getPersonTotalWeightedDeliverables(personId);
                
                const costPerWeightedPoint = totalPersonWeightedPoints > 0 
                    ? person.salary / totalPersonWeightedPoints 
                    : 0;

                // Custo desta pessoa neste contrato
                const personCostInContract = personWeightedPointsInContract * costPerWeightedPoint;
                cost += personCostInContract;

                // Adicionar ao breakdown
                if (personWeightedPointsInContract > 0) {
                    costBreakdown.push({
                        personId: person.id,
                        name: person.name,
                        role: person.role,
                        costPerWeightedPoint: costPerWeightedPoint,
                        weightedPointsInContract: personWeightedPointsInContract,
                        totalCost: personCostInContract
                    });
                }
            });

            // ✅ ADICIONAR CUSTO DE HEADS DE SQUADS
            const squads = storage.getSquads();
            squads.forEach(squad => {
                if (squad.head && !contract.assignedPeople.includes(squad.head)) {
                    // Head não está diretamente no contrato
                    // Verificar se algum membro do squad está
                    const hasSquadMemberInContract = squad.members.some(memberId => 
                        contract.assignedPeople.includes(memberId)
                    );

                    if (hasSquadMemberInContract && contract.squadTag === squad.id) {
                        const head = storage.getPersonById(squad.head);
                        if (head) {
                            // Calcular proporção de entregáveis totais do contrato
                            let contractTotalWeightedPoints = 0;
                            
                            if (contract.deliverables) {
                                Object.entries(contract.deliverables).forEach(([typeId, quantity]) => {
                                    // Usar peso padrão para cálculo proporcional
                                    const type = storage.getDeliverableTypeById(typeId);
                                    const weight = (type && type.defaultWeight) || 1;
                                    contractTotalWeightedPoints += (quantity * weight);
                                });
                            }

                            const headTotalWeightedPoints = this.getPersonTotalWeightedDeliverables(head.id);
                            const headCostPerPoint = headTotalWeightedPoints > 0 
                                ? head.salary / headTotalWeightedPoints 
                                : 0;
                            
                            const headCostInContract = contractTotalWeightedPoints * headCostPerPoint;
                            cost += headCostInContract;

                            if (contractTotalWeightedPoints > 0) {
                                costBreakdown.push({
                                    personId: head.id,
                                    name: head.name + ' (Head)',
                                    role: head.role,
                                    costPerWeightedPoint: headCostPerPoint,
                                    weightedPointsInContract: contractTotalWeightedPoints,
                                    totalCost: headCostInContract
                                });
                            }
                        }
                    }
                }
            });
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
    // OUTRAS FUNÇÕES (MANTIDAS/ATUALIZADAS)
    // ========================================

    getPersonCost(personId) {
        const person = storage.getPersonById(personId);
        return person ? person.salary : 0;
    }

    getPersonTotalDeliverables(personId) {
        const person = storage.getPersonById(personId);
        if (!person || !person.deliverables) return 0;

        return Object.values(person.deliverables).reduce((sum, qty) => sum + qty, 0);
    }

    getPersonCostPerDeliverable(personId) {
        const totalWeightedPoints = this.getPersonTotalWeightedDeliverables(personId);
        const person = storage.getPersonById(personId);
        
        if (!person || totalWeightedPoints === 0) return 0;
        
        return person.salary / totalWeightedPoints;
    }

    getPersonContracts(personId) {
        const contracts = storage.getContracts();
        return contracts.filter(contract => 
            contract.assignedPeople && contract.assignedPeople.includes(personId)
        );
    }

    getPersonAverageTicket(personId) {
        const contracts = this.getPersonContracts(personId);
        if (contracts.length === 0) return 0;
        
        const totalValue = contracts.reduce((sum, contract) => sum + contract.value, 0);
        return totalValue / contracts.length;
    }

    getSquadROI(squadId) {
        const contracts = this.getSquadContracts(squadId);
        const squad = storage.getSquadById(squadId);
        if (!squad) return { revenue: 0, cost: 0, profit: 0, margin: 0, contractCount: 0 };
        
        const totalRevenue = contracts.reduce((sum, contract) => sum + contract.value, 0);
        
        let totalCost = 0;
        squad.members.forEach(personId => {
            const proratedCosts = this.getPersonProratedCostBySquad(personId);
            totalCost += proratedCosts[squadId] || 0;
        });

        return {
            revenue: totalRevenue,
            cost: totalCost,
            profit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
            contractCount: contracts.length
        };
    }

    getSquadContracts(squadId) {
        const contracts = storage.getContracts();
        return contracts.filter(contract => contract.squadTag === squadId);
    }

    getPersonProratedCostBySquad(personId) {
        const squads = storage.getSquads().filter(squad => 
            squad.members.includes(personId)
        );
        
        const person = storage.getPersonById(personId);
        if (!person || squads.length === 0) return {};

        const costs = {};
        const perSquadCost = person.salary / squads.length;
        
        squads.forEach(squad => {
            costs[squad.id] = perSquadCost;
        });

        return costs;
    }

    getOverallROI() {
        const contracts = storage.getContracts();
        const people = storage.getPeople();
        
        const totalRevenue = contracts.reduce((sum, contract) => sum + contract.value, 0);
        const totalCost = people.reduce((sum, person) => sum + person.salary, 0);
        
        return {
            revenue: totalRevenue,
            cost: totalCost,
            profit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
        };
    }

    getProductivityRanking() {
        const people = storage.getPeople();
        
        return people.map(person => {
            const totalWeightedPoints = this.getPersonTotalWeightedDeliverables(person.id);
            const costPerPoint = totalWeightedPoints > 0 ? person.salary / totalWeightedPoints : 0;
            const contracts = this.getPersonContracts(person.id);
            
            return {
                id: person.id,
                name: person.name,
                role: person.role,
                salary: person.salary,
                totalWeightedPoints,
                costPerPoint,
                contractCount: contracts.length,
                efficiency: totalWeightedPoints > 0 ? person.salary / totalWeightedPoints : 0
            };
        }).sort((a, b) => a.costPerPoint - b.costPerPoint);
    }

    comparePeopleByRole(role) {
        const people = storage.getPeople().filter(p => p.role === role);
        
        return people.map(person => {
            const totalDeliverables = this.getPersonTotalDeliverables(person.id);
            const totalWeightedPoints = this.getPersonTotalWeightedDeliverables(person.id);
            const costPerPoint = this.getPersonCostPerDeliverable(person.id);
            const contracts = this.getPersonContracts(person.id);
            
            let totalContractValue = 0;
            contracts.forEach(contract => {
                totalContractValue += contract.value;
            });
            
            const ticketMedio = contracts.length > 0 ? totalContractValue / contracts.length : 0;
            
            return {
                id: person.id,
                name: person.name,
                role: person.role,
                salary: person.salary,
                totalDeliverables,
                totalWeightedPoints,
                costPerDeliverable: costPerPoint,
                contractCount: contracts.length,
                totalContractValue,
                ticketMedio
            };
        }).sort((a, b) => a.costPerDeliverable - b.costPerDeliverable);
    }

    getContractProfitabilityRanking() {
        const contracts = storage.getContracts();
        
        return contracts.map(contract => {
            const roi = this.getContractROI(contract.id);
            return {
                id: contract.id,
                client: contract.client,
                value: contract.value,
                ...roi
            };
        }).sort((a, b) => b.margin - a.margin);
    }

    getDeliverablesBreakdown() {
        const contracts = storage.getContracts();
        const deliverableTypes = storage.getDeliverableTypes();
        const breakdown = {};
        
        contracts.forEach(contract => {
            if (contract.deliverables) {
                Object.entries(contract.deliverables).forEach(([typeId, quantity]) => {
                    const deliverableType = deliverableTypes.find(dt => dt.id === typeId);
                    const typeName = deliverableType ? deliverableType.name : typeId;
                    
                    if (!breakdown[typeName]) {
                        breakdown[typeName] = 0;
                    }
                    breakdown[typeName] += quantity;
                });
            }
        });

        return breakdown;
    }

    getHeadAnalytics(headId) {
        const head = storage.getPersonById(headId);
        if (!head) return null;

        const squads = storage.getSquads();
        const headSquads = squads.filter(s => s.head === headId);
        
        if (headSquads.length === 0) return null;

        let totalRevenue = 0;
        let totalDeliverables = 0;
        const deliverablesByType = {};
        const contracts = [];

        headSquads.forEach(squad => {
            const squadContracts = this.getSquadContracts(squad.id);
            contracts.push(...squadContracts);

            squadContracts.forEach(contract => {
                totalRevenue += contract.value;
                
                if (contract.deliverables) {
                    Object.entries(contract.deliverables).forEach(([typeId, qty]) => {
                        const type = storage.getDeliverableTypeById(typeId);
                        const typeName = type ? type.name : 'Desconhecido';
                        
                        if (!deliverablesByType[typeName]) {
                            deliverablesByType[typeName] = 0;
                        }
                        deliverablesByType[typeName] += qty;
                        totalDeliverables += qty;
                    });
                }
            });
        });

        const costPerContract = contracts.length > 0 ? head.salary / contracts.length : 0;

        return {
            head: {
                id: head.id,
                name: head.name,
                salary: head.salary
            },
            squad: headSquads[0],
            contracts: contracts.map(c => ({
                id: c.id,
                client: c.client,
                value: c.value
            })),
            totalRevenue,
            totalDeliverables,
            deliverablesByType,
            costPerContract,
            contractCount: contracts.length
        };
    }

    getSquadComparison() {
        const squads = storage.getSquads();
        
        return squads.map(squad => {
            const roi = this.getSquadROI(squad.id);
            
            return {
                id: squad.id,
                name: squad.name,
                memberCount: squad.members.length,
                contractCount: roi.contractCount,
                revenue: roi.revenue,
                cost: roi.cost,
                profit: roi.profit,
                margin: roi.margin,
                revenuePerMember: squad.members.length > 0 ? roi.revenue / squad.members.length : 0
            };
        }).sort((a, b) => b.profit - a.profit);
    }
}

export default new AnalyticsService();
