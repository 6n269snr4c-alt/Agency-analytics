// analyticsService.js - Analytics and ROI calculation service

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

    getPersonTotalWeightedDeliverables(personId) {
        const contracts = this.getPersonContracts(personId);
        const person = storage.getPersonById(personId);
        
        if (!person) return 0;

        let totalWeightedPoints = 0;

        contracts.forEach(contract => {
            if (contract.deliverables) {
                Object.entries(contract.deliverables).forEach(([typeId, quantity]) => {
                    const weight = this.getWeightForRole(person.role, typeId);
                    totalWeightedPoints += (quantity * weight);
                });
            }
        });

        return totalWeightedPoints;
    }

    // ========================================
    // CÁLCULO DE ROI DO CONTRATO
    // ========================================
    
    getContractROI(contractId) {
        const contract = storage.getContractById(contractId);
        if (!contract) {
            return { revenue: 0, cost: 0, profit: 0, margin: 0, costBreakdown: [] };
        }

        const revenue = contract.value;
        let cost = 0;
        const costBreakdown = [];

        // CUSTO DAS PESSOAS
        if (contract.assignedPeople && contract.assignedPeople.length > 0) {
            contract.assignedPeople.forEach(personId => {
                const person = storage.getPersonById(personId);
                if (!person) return;

                let personWeightedPointsInContract = 0;

                if (contract.deliverables) {
                    Object.entries(contract.deliverables).forEach(([typeId, quantity]) => {
                        const weight = this.getWeightForRole(person.role, typeId);
                        personWeightedPointsInContract += (quantity * weight);
                    });
                }

                const totalPersonWeightedPoints = this.getPersonTotalWeightedDeliverables(personId);
                const costPerWeightedPoint = totalPersonWeightedPoints > 0 
                    ? person.salary / totalPersonWeightedPoints 
                    : 0;

                const personCostInContract = personWeightedPointsInContract * costPerWeightedPoint;
                cost += personCostInContract;

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
    // OUTRAS FUNÇÕES
    // ========================================

    getPersonCost(personId) {
        const person = storage.getPersonById(personId);
        return person ? person.salary : 0;
    }

    getPersonTotalDeliverables(personId) {
        const contracts = this.getPersonContracts(personId);
        const person = storage.getPersonById(personId);
        
        if (!person) return 0;

        let total = 0;

        contracts.forEach(contract => {
            if (contract.deliverables) {
                Object.values(contract.deliverables).forEach(qty => {
                    total += qty;
                });
            }
        });

        return total;
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

    getSquadContracts(squadId) {
        const contracts = storage.getContracts();
        return contracts.filter(contract => contract.squadId === squadId);
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

    getSquadROI(squadId) {
        const contracts = this.getSquadContracts(squadId);
        const squad = storage.getSquadById(squadId);
        
        if (!squad) {
            return { revenue: 0, cost: 0, profit: 0, margin: 0, contractCount: 0 };
        }
        
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

    getPersonDeliverablesBreakdown(personId) {
        const person = storage.getPersonById(personId);
        if (!person) return { total: 0, byType: {}, byContract: {} };

        const contracts = this.getPersonContracts(personId);
        const breakdown = {
            total: 0,
            byType: {},
            byContract: {}
        };

        contracts.forEach(contract => {
            if (!contract.deliverables) return;

            let contractTotal = 0;
            const contractBreakdown = {};

            Object.entries(contract.deliverables).forEach(([typeId, quantity]) => {
                const type = storage.getDeliverableTypeById(typeId);
                
                if (type && type.roles && type.roles.includes(person.role)) {
                    if (!breakdown.byType[type.name]) {
                        breakdown.byType[type.name] = 0;
                    }
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
