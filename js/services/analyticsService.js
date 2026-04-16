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

    // Get all contracts for a squad (based on people in that squad)
    getSquadContracts(squadId) {
        const squad = storage.getSquadById(squadId);
        if (!squad) return [];
        
        const contracts = storage.getContracts();
        return contracts.filter(contract => {
            if (!contract.assignedPeople) return false;
            // Contract is "in squad" if ANY of its assigned people are in this squad
            return contract.assignedPeople.some(personId => 
                squad.members.includes(personId)
            );
        });
    }

    // Calculate total deliverables for a person
    getPersonTotalDeliverables(personId) {
        const contracts = this.getPersonContracts(personId);
        return contracts.reduce((total, contract) => {
            return total + this.getContractTotalDeliverables(contract);
        }, 0);
    }

    // Calculate total deliverables for a contract
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

    // Calculate ROI for a contract
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

        return {
            revenue,
            cost,
            profit: revenue - cost,
            margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
        };
    }

    // Calculate ROI for a squad
    getSquadROI(squadId) {
        const contracts = this.getSquadContracts(squadId);
        const squadCost = this.getSquadCost(squadId);
        
        const totalRevenue = contracts.reduce((sum, contract) => sum + contract.value, 0);
        
        return {
            revenue: totalRevenue,
            cost: squadCost,
            profit: totalRevenue - squadCost,
            margin: totalRevenue > 0 ? ((totalRevenue - squadCost) / totalRevenue) * 100 : 0,
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
                cost: cost,
                profit: roi.profit,
                margin: roi.margin,
                revenuePerMember: squad.members.length > 0 ? roi.revenue / squad.members.length : 0
            };
        }).sort((a, b) => b.profit - a.profit);
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
