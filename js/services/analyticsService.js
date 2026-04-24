// analyticsService.js - MODIFICAÇÃO: Head Executivo por Cliente

// ADICIONAR ESTA FUNÇÃO NO analyticsService.js

/**
 * Calcula custo do Head Executivo por cliente
 * Lógica: Salário do Head ÷ Número de clientes do squad
 */
getHeadCostForContract(contractId) {
    const contract = storage.getContractById(contractId);
    if (!contract || !contract.squadId) return 0;
    
    const squad = storage.getSquadById(contract.squadId);
    if (!squad || !squad.headId) return 0;
    
    const head = storage.getPersonById(squad.headId);
    if (!head) return 0;
    
    // Contar quantos CLIENTES ÚNICOS o squad atende
    const allContracts = storage.getContracts();
    const squadContracts = allContracts.filter(c => c.squadId === squad.id);
    
    // Extrair clientes únicos
    const uniqueClients = [...new Set(squadContracts.map(c => c.client))];
    const clientCount = uniqueClients.length;
    
    if (clientCount === 0) return 0;
    
    // Custo do Head dividido igualmente entre clientes
    const headCostPerClient = head.salary / clientCount;
    
    return headCostPerClient;
}

/**
 * MODIFICAR FUNÇÃO getContractROI para incluir Head
 */
getContractROI(contractId) {
    const contract = storage.getContractById(contractId);
    if (!contract) {
        return { revenue: 0, cost: 0, profit: 0, margin: 0, costBreakdown: [] };
    }

    const revenue = contract.value;
    let cost = 0;
    const costBreakdown = [];

    // ========================================
    // 1. CUSTO DAS PESSOAS NORMAIS
    // ========================================
    if (contract.assignedPeople && contract.assignedPeople.length > 0) {
        contract.assignedPeople.forEach(personId => {
            const person = storage.getPersonById(personId);
            if (!person) return;

            // Pular se for Head Executivo (será calculado separadamente)
            const squad = storage.getSquadById(contract.squadId);
            if (squad && squad.headId === personId) return;

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

    // ========================================
    // 2. CUSTO DO HEAD EXECUTIVO (POR CLIENTE)
    // ========================================
    const headCost = this.getHeadCostForContract(contractId);
    
    if (headCost > 0) {
        cost += headCost;
        
        const squad = storage.getSquadById(contract.squadId);
        const head = storage.getPersonById(squad.headId);
        
        if (head) {
            costBreakdown.push({
                personId: head.id,
                name: head.name + ' (Head - Estratégia)',
                role: head.role,
                costPerWeightedPoint: 0, // Não aplicável
                weightedPointsInContract: 0, // Não aplicável
                totalCost: headCost,
                isHead: true // Flag para identificar
            });
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

/**
 * MODIFICAR getSquadROI para incluir Head
 */
getSquadROI(squadId) {
    const contracts = this.getSquadContracts(squadId);
    const squad = storage.getSquadById(squadId);
    
    if (!squad) {
        return { revenue: 0, cost: 0, profit: 0, margin: 0, contractCount: 0 };
    }
    
    const totalRevenue = contracts.reduce((sum, contract) => sum + contract.value, 0);
    
    // Custo dos membros (sem Head)
    let membersCost = 0;
    squad.members.forEach(personId => {
        // Pular Head
        if (squad.headId === personId) return;
        
        const proratedCosts = this.getPersonProratedCostBySquad(personId);
        membersCost += proratedCosts[squadId] || 0;
    });
    
    // Custo do Head (se tiver)
    let headCost = 0;
    if (squad.headId) {
        const head = storage.getPersonById(squad.headId);
        if (head) {
            headCost = head.salary;
        }
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
