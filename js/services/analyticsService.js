// ============================================
// ANALYTICS SERVICE - Agency Analytics v2
// Cálculos com Sistema de Pesos
// ============================================

import storage from '../store/storage.js';

class AnalyticsService {
    
    // ========================================
    // CÁLCULOS DE CUSTO POR PESSOA
    // ========================================
    
    /**
     * Calcula o custo PONDERADO por entregável de uma pessoa
     * 
     * Exemplo:
     * - Pessoa: Filmmaker com salário R$ 3.000
     * - Entregáveis: 5 vídeos editados (peso 5) + 80 clipes (peso 1)
     * - Soma dos pesos: (5 × 5) + (80 × 1) = 25 + 80 = 105
     * - Custo por unidade de peso: R$ 3.000 / 105 = R$ 28,57
     */
    getPersonWeightedDeliverableCost(personId) {
        const person = storage.getPersonById(personId);
        if (!person || person.salary === 0) {
            return 0;
        }

        // Pega a função da pessoa
        const role = storage.getRoleByName(person.role);
        if (!role) {
            console.warn(`Função não encontrada para ${person.name}: ${person.role}`);
            return 0;
        }

        // Calcula a soma ponderada dos entregáveis
        let totalWeightedDeliverables = 0;
        
        Object.entries(person.deliverables || {}).forEach(([deliverableTypeId, quantity]) => {
            if (quantity > 0) {
                // Pega o peso específico da função para este tipo de entregável
                const weight = storage.getRoleDeliverableWeight(role.id, deliverableTypeId);
                totalWeightedDeliverables += (quantity * weight);
            }
        });

        if (totalWeightedDeliverables === 0) {
            return 0;
        }

        // Custo por unidade de peso
        return person.salary / totalWeightedDeliverables;
    }

    /**
     * Retorna detalhamento completo do custo de uma pessoa
     */
    getPersonCostBreakdown(personId) {
        const person = storage.getPersonById(personId);
        if (!person) return null;

        const role = storage.getRoleByName(person.role);
        const costPerWeightUnit = this.getPersonWeightedDeliverableCost(personId);

        const breakdown = {
            personId: person.id,
            personName: person.name,
            role: person.role,
            salary: person.salary,
            deliverables: [],
            totalWeightedDeliverables: 0,
            costPerWeightUnit: costPerWeightUnit
        };

        // Detalha cada tipo de entregável
        Object.entries(person.deliverables || {}).forEach(([deliverableTypeId, quantity]) => {
            const deliverableType = storage.getDeliverableTypeById(deliverableTypeId);
            if (!deliverableType || quantity === 0) return;

            const weight = role ? storage.getRoleDeliverableWeight(role.id, deliverableTypeId) : deliverableType.defaultWeight;
            const totalWeight = quantity * weight;

            breakdown.deliverables.push({
                deliverableTypeId,
                deliverableTypeName: deliverableType.name,
                quantity,
                weight,
                totalWeight,
                costForThisType: costPerWeightUnit * totalWeight
            });

            breakdown.totalWeightedDeliverables += totalWeight;
        });

        return breakdown;
    }

    /**
     * Custo simples da pessoa (apenas salário)
     */
    getPersonCost(personId) {
        const person = storage.getPersonById(personId);
        return person ? person.salary : 0;
    }

    // ========================================
    // CÁLCULOS DE CUSTO POR CONTRATO
    // ========================================
    
    /**
     * Calcula o custo de uma pessoa em um contrato específico
     * Baseado nos entregáveis que ela faz naquele contrato
     */
    getPersonCostInContract(personId, contractId) {
        const person = storage.getPersonById(personId);
        const contract = storage.getContractById(contractId);
        
        if (!person || !contract) return 0;

        const role = storage.getRoleByName(person.role);
        if (!role) return 0;

        const costPerWeightUnit = this.getPersonWeightedDeliverableCost(personId);
        if (costPerWeightUnit === 0) return 0;

        // Calcula quantos entregáveis dessa pessoa estão no contrato
        let personWeightInContract = 0;

        Object.entries(contract.deliverables || {}).forEach(([deliverableTypeId, quantity]) => {
            const deliverableType = storage.getDeliverableTypeById(deliverableTypeId);
            if (!deliverableType) return;

            // Verifica se a função da pessoa faz esse tipo de entregável
            if (deliverableType.roles.includes(person.role)) {
                const weight = storage.getRoleDeliverableWeight(role.id, deliverableTypeId);
                personWeightInContract += (quantity * weight);
            }
        });

        // Custo da pessoa no contrato = custo por unidade × peso no contrato
        return costPerWeightUnit * personWeightInContract;
    }

    /**
     * Calcula ROI de um contrato
     */
    getContractROI(contractId) {
        const contract = storage.getContractById(contractId);
        if (!contract) return null;

        const revenue = contract.value;
        let cost = 0;

        // PASSO 1: Soma o custo de cada pessoa selecionada no contrato
        if (contract.assignedPeople && contract.assignedPeople.length > 0) {
            contract.assignedPeople.forEach(personId => {
                cost += this.getPersonCostInContract(personId, contractId);
            });
        }

        // PASSO 2: Adiciona o custo rateado do Head (se tiver squad)
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
            margin: revenue > 0 ? ((revenue - cost) / revenue * 100) : 0
        };
    }

    /**
     * Detalhamento completo do custo de um contrato
     */
    getContractCostBreakdown(contractId) {
        const contract = storage.getContractById(contractId);
        if (!contract) return null;

        const breakdown = {
            contractId: contract.id,
            clientName: contract.clientName,
            revenue: contract.value,
            people: [],
            headCost: 0,
            totalCost: 0
        };

        // Detalha custo de cada pessoa
        contract.assignedPeople.forEach(personId => {
            const person = storage.getPersonById(personId);
            const personCost = this.getPersonCostInContract(personId, contractId);
            
            breakdown.people.push({
                personId,
                personName: person.name,
                role: person.role,
                costInContract: personCost
            });
            
            breakdown.totalCost += personCost;
        });

        // Adiciona custo do head
        if (contract.squadTag) {
            const squad = storage.getSquadById(contract.squadTag);
            if (squad && squad.headId) {
                const squadContracts = this.getSquadContracts(contract.squadTag);
                const head = storage.getPersonById(squad.headId);
                
                if (head && squadContracts.length > 0) {
                    breakdown.headCost = head.salary / squadContracts.length;
                    breakdown.totalCost += breakdown.headCost;
                }
            }
        }

        breakdown.profit = breakdown.revenue - breakdown.totalCost;
        breakdown.margin = breakdown.revenue > 0 ? ((breakdown.profit / breakdown.revenue) * 100) : 0;

        return breakdown;
    }

    // ========================================
    // CÁLCULOS DE SQUAD
    // ========================================
    
    getSquadContracts(squadId) {
        const period = storage.getCurrentPeriod();
        return storage.getContracts().filter(c => 
            c.squadTag === squadId && c.period === period
        );
    }

    getSquadROI(squadId) {
        const squad = storage.getSquadById(squadId);
        if (!squad) return null;

        const contracts = this.getSquadContracts(squadId);
        
        let totalRevenue = 0;
        let totalCost = 0;

        contracts.forEach(contract => {
            const roi = this.getContractROI(contract.id);
            if (roi) {
                totalRevenue += roi.revenue;
                totalCost += roi.cost;
            }
        });

        return {
            squadId,
            squadName: squad.name,
            contractCount: contracts.length,
            totalRevenue,
            totalCost,
            profit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0
        };
    }

    // ========================================
    // ANÁLISES COMPARATIVAS
    // ========================================
    
    /**
     * Compara pessoas da mesma função
     */
    comparePeopleByRole(roleName) {
        const people = storage.getPeople().filter(p => p.role === roleName);
        
        return people.map(person => {
            const breakdown = this.getPersonCostBreakdown(person.id);
            return {
                ...breakdown,
                efficiency: breakdown.costPerWeightUnit // Menor = mais eficiente
            };
        }).sort((a, b) => a.efficiency - b.efficiency);
    }

    /**
     * Ranking de contratos por margem
     */
    rankContractsByMargin() {
        const period = storage.getCurrentPeriod();
        const contracts = storage.getContractsByPeriod(period);
        
        return contracts.map(contract => {
            const roi = this.getContractROI(contract.id);
            return {
                contractId: contract.id,
                clientName: contract.clientName,
                ...roi
            };
        }).sort((a, b) => b.margin - a.margin);
    }

    /**
     * Estatísticas gerais da operação
     */
    getGeneralStats() {
        const period = storage.getCurrentPeriod();
        const contracts = storage.getContractsByPeriod(period);
        
        let totalRevenue = 0;
        let totalCost = 0;

        contracts.forEach(contract => {
            const roi = this.getContractROI(contract.id);
            if (roi) {
                totalRevenue += roi.revenue;
                totalCost += roi.cost;
            }
        });

        return {
            period,
            contractCount: contracts.length,
            totalRevenue,
            totalCost,
            profit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0,
            averageRevenuePerContract: contracts.length > 0 ? (totalRevenue / contracts.length) : 0
        };
    }
}

export default new AnalyticsService();
