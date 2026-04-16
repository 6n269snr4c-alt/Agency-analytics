// analyticsService.js - Business logic for ROI, productivity, and analytics

import storage from '../store/storage.js';

class AnalyticsService {
    // Calculate total cost of a person (monthly salary)
    getPersonCost(personId) {
        const person = storage.getPersonById(personId);
        return person ? person.salary : 0;
    }

    // Calculate total cost of a squad
    getSquadCost(squadId) {
        const squad = storage.getSquadById(squadId);
        if (!squad) return 0;
        
        return squad.members.reduce((total, personId) => {
            return total + this.getPersonCost(personId);
        }, 0);
    }

    // Get all contracts for a person
    getPersonContracts(personId) {
        const contracts = storage.getContracts();
        return contracts.filter(contract => {
            // Direct assignment
            if (contract.assignedPeople && contract.assignedPeople.includes(personId)) {
                return true;
            }
            return false;
        });
    }

    // Get all contracts tagged for a squad
    getSquadContracts(squadId) {
        const contracts = storage.getContracts();
        return contracts.filter(contract => contract.squadTag === squadId);
    }

    // Calculate prorated cost for a person across squads
    getPersonProratedCostBySquad(personId) {
        const person = storage.getPersonById(personId);
        if (!person) return {};

        const breakdown = this.getPersonDeliverablesBreakdown(personId);
        const squads = storage.getSquads().filter(s => s.members.includes(personId));
        
        if (squads.length === 0) return {};
        if (squads.length === 1) {
            // Person in only one squad - full cost goes there
            return { [squads[0].id]: person.salary };
        }

        // Person in multiple squads - prorate by deliverables
        const contracts = storage.getContracts();
        const deliverablesBySquad = {};
        let totalDeliverables = 0;

        contracts.forEach(contract => {
            if (!contract.squadTag || !contract.assignedPeople?.includes(personId)) return;
            if (!contract.deliverables) return;

            let contractDeliverables = 0;
            Object.entries(contract.deliverables).forEach(([typeId, qty]) => {
                const type = storage.getDeliverableTypeById(typeId);
                if (type && type.roles.includes(person.role)) {
                    contractDeliverables += qty;
                }
            });

            if (contractDeliverables > 0) {
                if (!deliverablesBySquad[contract.squadTag]) {
                    deliverablesBySquad[contract.squadTag] = 0;
                }
                deliverablesBySquad[contract.squadTag] += contractDeliverables;
                totalDeliverables += contractDeliverables;
            }
        });

        // Prorate salary by deliverable proportion
        const proratedCosts = {};
        Object.entries(deliverablesBySquad).forEach(([squadId, count]) => {
            const proportion = totalDeliverables > 0 ? count / totalDeliverables : 0;
            proratedCosts[squadId] = person.salary * proportion;
        });

        return proratedCosts;
    }

    // Calculate total deliverables for a person (considering their role in each type)
    getPersonTotalDeliverables(personId) {
        const person = storage.getPersonById(personId);
        if (!person) return 0;

        const contracts = this.getPersonContracts(personId);
        let total = 0;

        contracts.forEach(contract => {
            if (!contract.deliverables) return;

            // For each deliverable type in the contract
            Object.entries(contract.deliverables).forEach(([typeId, quantity]) => {
                const type = storage.getDeliverableTypeById(typeId);
                
                // Only count if this person's role is involved in this deliverable type
                if (type && type.roles.includes(person.role)) {
                    total += quantity;
                }
            });
        });

        return total;
    }

    // Calculate total deliverables for a contract (unchanged - just sum all)
    getContractTotalDeliverables(contract) {
        if (!contract.deliverables) return 0;
        return Object.values(contract.deliverables).reduce((sum, qty) => sum + qty, 0);
    }

    // Calculate cost per deliverable for a person
    getPersonCostPerDeliverable(personId) {
        const salary = this.getPersonCost(personId);
        const totalDeliverables = this.getPersonTotalDeliverables(personId);
        
        if (totalDeliverables === 0) return 0;
        return salary / totalDeliverables;
    }

    // Get detailed breakdown of deliverables for a person
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
                
                // Only count if this person's role is involved
                if (type && type.roles.includes(person.role)) {
                    // Aggregate by type
                    if (!breakdown.byType[type.name]) {
                        breakdown.byType[type.name] = 0;
                    }
                    breakdown.byType[type.name] += quantity;
                    breakdown.total += quantity;

                    // Track for this contract
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

    // Calculate ROI for a contract (including prorated head cost)
    getContractROI(contractId) {
        const contract = storage.getContractById(contractId);
        if (!contract) return null;

        const revenue = contract.value;
        let cost = 0;

        // Calculate cost based on assigned people
        if (contract.assignedPeople && contract.assignedPeople.length > 0) {
            cost = contract.assignedPeople.reduce((total, personId) => {
                return total + this.getPersonCost(personId);
            }, 0);
        }

        // Add prorated head cost if contract has squad tag
        if (contract.squadTag) {
            const squad = storage.getSquadById(contract.squadTag);
            if (squad && squad.headId) {
                const squadContracts = this.getSquadContracts(contract.squadTag);
                const head = storage.getPersonById(squad.headId);
                if (head && squadContracts.length > 0) {
                    const headCostPerContract = head.salary / squadContracts.length;
                    cost += headCostPerContract;
                }
            }
        }

        return {
            revenue,
            cost,
            profit: revenue - cost,
            margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
        };
    }

    // Calculate ROI for a squad (with prorated costs)
    getSquadROI(squadId) {
        const contracts = this.getSquadContracts(squadId);
        const squad = storage.getSquadById(squadId);
        if (!squad) return { revenue: 0, cost: 0, profit: 0, margin: 0, contractCount: 0 };
        
        const totalRevenue = contracts.reduce((sum, contract) => sum + contract.value, 0);
        
        // Calculate prorated cost for each member
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

    // Calculate overall ROI
    getOverallROI() {
        const contracts = storage.getContracts();
        const people = storage.getPeople();
        
        const totalRevenue = contracts.reduce((sum, contract) => sum + contract.value, 0);
        const totalCost = people.reduce((sum, person) => sum + person.salary, 0);
        
        return {
            revenue: totalRevenue,
            cost: totalCost,
            profit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
            contractCount: contracts.length,
            peopleCount: people.length
        };
    }

    // Get average ticket for a person's contracts
    getPersonAverageTicket(personId) {
        const contracts = this.getPersonContracts(personId);
        if (contracts.length === 0) return 0;
        
        const totalValue = contracts.reduce((sum, contract) => sum + contract.value, 0);
        return totalValue / contracts.length;
    }

    // Compare people by role
    comparePeopleByRole(role) {
        const people = storage.getPeople().filter(p => p.role === role);
        
        return people.map(person => {
            const contracts = this.getPersonContracts(person.id);
            const totalDeliverables = this.getPersonTotalDeliverables(person.id);
            const costPerDeliverable = this.getPersonCostPerDeliverable(person.id);
            const avgTicket = this.getPersonAverageTicket(person.id);
            
            return {
                id: person.id,
                name: person.name,
                role: person.role,
                salary: person.salary,
                contractCount: contracts.length,
                totalDeliverables,
                costPerDeliverable,
                averageTicket: avgTicket,
                efficiency: totalDeliverables > 0 ? person.salary / totalDeliverables : 0
            };
        }).sort((a, b) => a.costPerDeliverable - b.costPerDeliverable);
    }

    // Get productivity ranking
    getProductivityRanking() {
        const people = storage.getPeople();
        
        return people.map(person => {
            const totalDeliverables = this.getPersonTotalDeliverables(person.id);
            const costPerDeliverable = this.getPersonCostPerDeliverable(person.id);
            const contracts = this.getPersonContracts(person.id);
            
            return {
                id: person.id,
                name: person.name,
                role: person.role,
                totalDeliverables,
                costPerDeliverable,
                contractCount: contracts.length,
                score: totalDeliverables > 0 ? 1 / costPerDeliverable : 0
            };
        }).sort((a, b) => b.score - a.score);
    }

    // Get squad performance comparison
    getSquadComparison() {
        const squads = storage.getSquads();
        
        return squads.map(squad => {
            const roi = this.getSquadROI(squad.id);
            const cost = this.getSquadCost(squad.id);
            
            return {
                id: squad.id,
                name: squad.name,
                memberCount: squad.members.length,
                contractCount: roi.contractCount,
                revenue: roi.revenue,
                cost: roi.cost, // Now prorated!
                profit: roi.profit,
                margin: roi.margin,
                revenuePerMember: squad.members.length > 0 ? roi.revenue / squad.members.length : 0
            };
        }).sort((a, b) => b.profit - a.profit);
    }

    // Strategic squad analysis (detailed)
    getSquadStrategicAnalysis(squadId) {
        const squad = storage.getSquadById(squadId);
        if (!squad) return null;

        const contracts = this.getSquadContracts(squadId);
        const roi = this.getSquadROI(squadId);

        // Average ticket
        const avgTicket = contracts.length > 0 ? roi.revenue / contracts.length : 0;

        // Deliverables breakdown by type
        const deliverablesByType = {};
        contracts.forEach(contract => {
            if (!contract.deliverables) return;
            Object.entries(contract.deliverables).forEach(([typeId, qty]) => {
                const type = storage.getDeliverableTypeById(typeId);
                const typeName = type ? type.name : 'Desconhecido';
                if (!deliverablesByType[typeName]) {
                    deliverablesByType[typeName] = 0;
                }
                deliverablesByType[typeName] += qty;
            });
        });

        // Cost composition (with proration details)
        const costBreakdown = {};
        squad.members.forEach(personId => {
            const person = storage.getPersonById(personId);
            if (!person) return;

            const proratedCosts = this.getPersonProratedCostBySquad(personId);
            const squadCost = proratedCosts[squadId] || 0;
            const percentage = person.salary > 0 ? (squadCost / person.salary) * 100 : 0;

            costBreakdown[person.name] = {
                role: person.role,
                totalSalary: person.salary,
                allocatedToSquad: squadCost,
                allocationPercentage: percentage
            };
        });

        return {
            squad: {
                id: squad.id,
                name: squad.name,
                memberCount: squad.members.length
            },
            performance: {
                contractCount: contracts.length,
                revenue: roi.revenue,
                cost: roi.cost,
                profit: roi.profit,
                margin: roi.margin,
                avgTicket: avgTicket,
                revenuePerContract: avgTicket
            },
            deliverables: deliverablesByType,
            costBreakdown: costBreakdown
        };
    }

    // Head analysis - shows what a head manages
    getHeadAnalysis(headId) {
        const head = storage.getPersonById(headId);
        if (!head) return null;

        const squads = storage.getSquads();
        const squad = squads.find(s => s.headId === headId);
        
        if (!squad) {
            return {
                head: {
                    id: head.id,
                    name: head.name,
                    salary: head.salary
                },
                squad: null,
                contracts: [],
                totalRevenue: 0,
                totalDeliverables: 0,
                deliverablesByType: {},
                costPerContract: 0
            };
        }

        const contracts = this.getSquadContracts(squad.id);
        const totalRevenue = contracts.reduce((sum, c) => sum + c.value, 0);
        
        // Deliverables breakdown
        const deliverablesByType = {};
        let totalDeliverables = 0;
        
        contracts.forEach(contract => {
            if (!contract.deliverables) return;
            Object.entries(contract.deliverables).forEach(([typeId, qty]) => {
                const type = storage.getDeliverableTypeById(typeId);
                const typeName = type ? type.name : 'Desconhecido';
                if (!deliverablesByType[typeName]) {
                    deliverablesByType[typeName] = 0;
                }
                deliverablesByType[typeName] += qty;
                totalDeliverables += qty;
            });
        });

        const costPerContract = contracts.length > 0 ? head.salary / contracts.length : 0;

        return {
            head: {
                id: head.id,
                name: head.name,
                salary: head.salary
            },
            squad: {
                id: squad.id,
                name: squad.name,
                memberCount: squad.members.length
            },
            contracts: contracts.map(c => ({
                id: c.id,
                client: c.client,
                value: c.value
            })),
            totalRevenue: totalRevenue,
            totalDeliverables: totalDeliverables,
            deliverablesByType: deliverablesByType,
            costPerContract: costPerContract,
            contractCount: contracts.length
        };
    }

    // Get contract profitability ranking
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

    // Get deliverables breakdown
    getDeliverablesBreakdown() {
        const contracts = storage.getContracts();
        const breakdown = {};
        
        contracts.forEach(contract => {
            if (contract.deliverables) {
                Object.entries(contract.deliverables).forEach(([type, quantity]) => {
                    if (!breakdown[type]) {
                        breakdown[type] = { type, total: 0, contracts: 0 };
                    }
                    breakdown[type].total += quantity;
                    breakdown[type].contracts += 1;
                });
            }
        });
        
        return Object.values(breakdown).sort((a, b) => b.total - a.total);
    }

    // Get role distribution
    getRoleDistribution() {
        const people = storage.getPeople();
        const distribution = {};
        
        people.forEach(person => {
            if (!distribution[person.role]) {
                distribution[person.role] = { role: person.role, count: 0, totalSalary: 0 };
            }
            distribution[person.role].count += 1;
            distribution[person.role].totalSalary += person.salary;
        });
        
        return Object.values(distribution).map(item => ({
            ...item,
            averageSalary: item.totalSalary / item.count
        }));
    }
}

export default new AnalyticsService();
