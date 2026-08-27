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
//   rateado IGUALMENTE entre os clientes do squad — sem lançamento manual.
//   (Não é por volume nem por receita: qualquer métrica do cliente que possa
//   ser zero deixaria ele fora do rateio. Dividir por cliente nunca tem esse
//   problema.)

import storage from '../store/storage.js';
import projectService from './projectService.js';

class AnalyticsService {

    // ========================================
    // REGRA: QUAL ENTREGÁVEL CONTA PARA CADA FUNÇÃO
    // ========================================

    _relevantQuantity(role, data) {
        const v = data.videoCount || 0;
        const s = data.staticCount || 0;
        if (role === 'Filmmaker') return v;
        if (role === 'Designer')  return s;
        // Gestor de Tráfego não produz vídeo/estático — o que conta é o
        // contrato ter gestão de tráfego ou não. Rateio fica igual entre os
        // contratos de tráfego em que essa pessoa está alocada.
        if (role === 'Gestor de Tráfego') return data.trafficManagement ? 1 : 0;
        return v + s;
    }

    // ========================================
    // PERÍODO — helpers de projeção
    // ========================================

    _getProjectionData(contract, periodId) {
        return {
            value: contract.value || 0,
            videoCount: contract.videoCount || 0,
            staticCount: contract.staticCount || 0,
            trafficManagement: !!contract.trafficManagement,
            peopleAllocations: contract.peopleAllocations || []
        };
    }

    // ========================================
    // PESSOA — custo total
    // ========================================

    getPersonCost(personId, _periodId = null) {
        const person = storage.getPersonById(personId);
        if (!person) return 0;
        return person.salary || 0;
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

    /**
     * Contratos em que a pessoa está alocada no modo 'founder_brand' nesse
     * período — usados pra dividir igualmente o bloco reservado da % dela.
     */
    _founderBrandContractsForPerson(personId, periodId) {
        return this.getPersonContractsForPeriod(personId, periodId).filter(contract => {
            const data = this._getProjectionData(contract, periodId);
            const alloc = data.peopleAllocations.find(a => a.personId === personId);
            return alloc && alloc.mode === 'founder_brand';
        });
    }

    /**
     * Bloco reservado pra Founder Brand: % do salário da pessoa (definida no
     * cadastro dela) dividida igualmente entre os clientes Founder Brand que
     * ela atende nesse período. O resto do salário (100% − %) é o que sobra
     * pra rateio normal por vídeo/estático nos outros contratos dela.
     */
    _personFounderBrandReserve(personId, periodId) {
        const person = storage.getPersonById(personId);
        const pct = person ? (person.founderBrandPercent || 0) : 0;
        const salary = this.getPersonCost(personId, periodId);
        const fbContracts = this._founderBrandContractsForPerson(personId, periodId);

        if (pct === 0 || fbContracts.length === 0) {
            return { pct: 0, reserveTotal: 0, perClient: 0, fbContracts: [] };
        }

        const reserveTotal = salary * (pct / 100);
        return { pct, reserveTotal, perClient: reserveTotal / fbContracts.length, fbContracts };
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
            total += this._relevantQuantity(person.role, data);
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

        if (alloc.mode === 'founder_brand') {
            const reserve = this._personFounderBrandReserve(personId, currentPeriod);
            return reserve.perClient;
        }

        const relevantHere = this._relevantQuantity(person.role, data);
        if (relevantHere === 0) return 0;

        const totalRateable = this.getPersonTotalRateableDeliverables(personId, currentPeriod);
        if (totalRateable === 0) return 0;

        const salary = this.getPersonCost(personId, currentPeriod);
        const reserve = this._personFounderBrandReserve(personId, currentPeriod);
        const availableSalary = salary - reserve.reserveTotal;
        return (relevantHere / totalRateable) * availableSalary;
    }

    getPersonTotalAllocated(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);
        let total = 0;

        // Custo automático de Head (não está em peopleAllocations — soma aqui
        // pra Conferência Salarial não acusar divergência indevida). Inclui
        // tanto contratos recorrentes quanto projetos pontuais do squad.
        storage.getSquads()
            .filter(squad => squad.headId === personId)
            .forEach(squad => {
                activeContracts
                    .filter(c => c.squadTag === squad.id)
                    .forEach(c => { total += this.getHeadCostForContract(c.id, currentPeriod); });
                projectService.getProjectsForPeriod(currentPeriod)
                    .filter(p => p.squadId === squad.id)
                    .forEach(p => { total += this.getHeadCostForProject(p.id, currentPeriod); });
            });

        // Custo automático de Head Master — mesma ideia, mas agência toda.
        // Respeita o flag includeHeadMaster de cada contrato (igual ao getContractROI).
        const headMaster = this.getHeadMaster();
        if (headMaster && headMaster.id === personId) {
            activeContracts
                .filter(c => c.includeHeadMaster !== false)
                .forEach(c => { total += this.getHeadMasterCostForContract(c.id, currentPeriod); });
            projectService.getProjectsForPeriod(currentPeriod)
                .forEach(p => { total += this.getHeadMasterCostForProject(p.id, currentPeriod); });
        }

        // Alocações manuais (rateado/fixo) normais.
        this.getPersonContractsForPeriod(personId, currentPeriod).forEach(contract => {
            total += this.getPersonCostInContract(personId, contract.id, currentPeriod);
        });

        return total;
    }

    /**
     * Custo por entrega relevante (vídeo/estático, conforme o cargo) —
     * salário ÷ total de entregas rateáveis. Usado no ranking, na tela de
     * Pessoas e na comparação por cargo.
     */
    getPersonCostPerDeliverable(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const salary = this.getPersonCost(personId, currentPeriod);

        const profile = this.getPersonDeliveryProfile(personId, currentPeriod);
        if (profile.kind === 'head' || profile.kind === 'head_master') {
            return profile.contractCount > 0 ? salary / profile.contractCount : 0;
        }

        const totalRateable = this.getPersonTotalRateableDeliverables(personId, currentPeriod);
        if (totalRateable > 0) return salary / totalRateable;

        // Sem nada rateado: se só recebe por valor fixo, "custo por entrega"
        // passa a ser o valor fixo dividido pelos criativos reais entregues
        // (vídeo/estático, ou contratos de tráfego) — e só cai na média por
        // contrato como último recurso, se não houver nenhum criativo lançado
        // (ex.: um retainer fixo sem vídeo/estático informado).
        if (profile.fixedTotal > 0) {
            if (profile.total > 0) return profile.fixedTotal / profile.total;
            if (profile.fixedCount > 0) return profile.fixedTotal / profile.fixedCount;
        }
        return 0;
    }

    /**
     * Quebra das entregas rateáveis de uma pessoa por tipo (Vídeo/Estático),
     * somando apenas contratos em modo 'rateado'. Usado na tela de Pessoas.
     */
    getPersonDeliverablesBreakdown(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const person = storage.getPersonById(personId);
        if (!person) return { byType: {} };

        const contracts = this.getPersonContractsForPeriod(personId, currentPeriod);
        let video = 0;
        let estatico = 0;

        contracts.forEach(contract => {
            const data = this._getProjectionData(contract, currentPeriod);
            const alloc = data.peopleAllocations.find(a => a.personId === personId);
            if (!alloc || alloc.mode !== 'rateado') return;

            if (person.role === 'Filmmaker') {
                video += data.videoCount || 0;
            } else if (person.role === 'Designer') {
                estatico += data.staticCount || 0;
            } else {
                video    += data.videoCount  || 0;
                estatico += data.staticCount || 0;
            }
        });

        const byType = {};
        if (video > 0)    byType['Vídeo']    = video;
        if (estatico > 0) byType['Estático'] = estatico;

        return { byType };
    }

    /**
     * Detalhamento da alocação de uma pessoa em UM contrato específico —
     * usado no modal "Ver Cálculo Detalhado" da tela de Pessoas.
     */
    getPersonContractBreakdown(personId, contractId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contract = storage.getContractById(contractId);
        const person = storage.getPersonById(personId);
        if (!contract || !person) return null;

        const data = this._getProjectionData(contract, currentPeriod);
        const alloc = data.peopleAllocations.find(a => a.personId === personId);
        if (!alloc) return null;

        const relevantQuantity = this._relevantQuantity(person.role, data);
        const cost = this.getPersonCostInContract(personId, contractId, currentPeriod);
        const fbReserve = alloc.mode === 'founder_brand' ? this._personFounderBrandReserve(personId, currentPeriod) : null;

        return {
            contractId,
            client: contract.client,
            mode: alloc.mode,
            fixedValue: alloc.fixedValue || 0,
            videoCount: data.videoCount || 0,
            staticCount: data.staticCount || 0,
            relevantQuantity,
            cost,
            founderBrandReservePct: fbReserve ? fbReserve.pct : null,
            founderBrandClientCount: fbReserve ? fbReserve.fbContracts.length : null
        };
    }

    getSalaryReconciliation(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const people = storage.getPeople();
        const headSquadIds = new Set(storage.getSquads().filter(s => s.headId).map(s => s.headId));
        const headMaster = this.getHeadMaster();

        return people.map(person => {
            const salary    = this.getPersonCost(person.id, currentPeriod);
            const allocated = this.getPersonTotalAllocated(person.id, currentPeriod);
            const isHead = headSquadIds.has(person.id) || (headMaster && headMaster.id === person.id);
            const hasFixedOnly = !isHead && this._hasOnlyFixedAllocations(person.id, currentPeriod);
            const diff = salary - allocated;

            return {
                personId: person.id,
                name: person.name,
                role: person.role,
                salary,
                allocated,
                diff,
                isHead,
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

    // Rateio do Head por RECEITA (não por volume de vídeo/estático): assim
    // clientes só de gestão de tráfego — que não têm vídeo nem estático, mas
    // pagam e também são geridos pelo Head — entram na conta corretamente.
    // Antes disso era por volume, e um cliente sem entregável "sumia" do rateio,
    // empurrando o custo inteiro do Head pros clientes que tinham vídeo/estático.

    // Rateio do Head: igual entre os CLIENTES do squad — não por volume nem por
    // receita. Os dois já se mostraram falhos: qualquer métrica do cliente que
    // possa ser zero (tráfego sem vídeo/estático, parceria sem receita) deixa
    // esse cliente fora do rateio e empurra o custo inteiro pros outros.
    // Dividir por cliente nunca tem esse problema — todo cliente ativo conta 1.
    // Receita só entra como critério secundário, pra dividir entre contratos
    // de um MESMO cliente quando ele tem mais de um — com fallback pra divisão
    // igual também aí, se a receita desses contratos específicos for zero.

    // Universo de clientes de um squad num período — conta contratos recorrentes
    // E projetos pontuais. Heads atuam nos dois, então o rateio igual-por-cliente
    // precisa considerar ambos, senão um cliente só-de-projeto fica de fora.
    _squadClientsInPeriod(squadId, periodId, includeProjects = true) {
        const contractClients = storage.getActiveContractsForPeriod(periodId)
            .filter(c => c.squadTag === squadId)
            .map(c => c.client);
        if (!includeProjects) {
            return Array.from(new Set(contractClients));
        }
        const projectClients = projectService.getProjectsForPeriod(periodId)
            .filter(p => p.squadId === squadId)
            .map(p => p.client || p.name);
        return Array.from(new Set([...contractClients, ...projectClients]));
    }

    // Receita de um cliente dentro do squad/período, somando contratos E projetos
    // pontuais — usado só pra dividir entre múltiplos contratos/projetos do MESMO
    // cliente, depois que a parte igual-por-cliente já foi definida.
    _clientRevenueAcrossSquad(squadId, clientName, periodId, includeProjects = true) {
        const contractsRevenue = storage.getActiveContractsForPeriod(periodId)
            .filter(c => c.squadTag === squadId && c.client === clientName)
            .reduce((sum, c) => sum + (this._getProjectionData(c, periodId).value || 0), 0);
        if (!includeProjects) return contractsRevenue;
        const projectsRevenue = projectService.getProjectsForPeriod(periodId)
            .filter(p => p.squadId === squadId && (p.client || p.name) === clientName)
            .reduce((sum, p) => sum + (p.value || 0), 0);
        return contractsRevenue + projectsRevenue;
    }

    getHeadCostForContract(contractId, periodId = null, includeProjects = true) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contract = storage.getContractById(contractId);
        if (!contract || !contract.squadTag) return 0;

        const squad = storage.getSquadById(contract.squadTag);
        if (!squad || !squad.headId) return 0;

        const headSalary = this.getPersonCost(squad.headId, currentPeriod);
        if (headSalary === 0) return 0;

        const distinctClients = this._squadClientsInPeriod(squad.id, currentPeriod, includeProjects);
        if (distinctClients.length === 0) return 0;

        const headCostPerClient = headSalary / distinctClients.length;

        const clientRevenue = this._clientRevenueAcrossSquad(squad.id, contract.client, currentPeriod, includeProjects);
        if (clientRevenue === 0) {
            const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);
            const clientContracts = activeContracts.filter(c => c.squadTag === squad.id && c.client === contract.client);
            const clientProjects  = includeProjects
                ? projectService.getProjectsForPeriod(currentPeriod).filter(p => p.squadId === squad.id && (p.client || p.name) === contract.client)
                : [];
            const sharedCount = clientContracts.length + clientProjects.length;
            return sharedCount <= 1 ? headCostPerClient : headCostPerClient / sharedCount;
        }

        const thisContractRevenue = this._getProjectionData(contract, currentPeriod).value || 0;
        return headCostPerClient * (thisContractRevenue / clientRevenue);
    }

    // Mesma lógica do Head, agora para um projeto pontual — usa o MESMO universo
    // de clientes do squad+período (contratos + projetos), então a parte de
    // cada um soma certinho ao salário do Head.
    // ====================
    // HEAD MASTER — rateio igual por cliente, AGÊNCIA TODA (sem fronteira
    // de squad). Mesma lógica do Head normal, só que o "squad" dela é a
    // empresa inteira. Só pode existir uma pessoa com esse cargo por vez;
    // se houver mais de uma, a primeira encontrada é considerada.
    // ====================

    getHeadMaster() {
        return storage.getPeople().find(p => p.role === 'Head Master') || null;
    }

    _allClientsInPeriod(periodId, includeProjects = true) {
        const contractClients = storage.getActiveContractsForPeriod(periodId).map(c => c.client);
        if (!includeProjects) return Array.from(new Set(contractClients));
        const projectClients = projectService.getProjectsForPeriod(periodId).map(p => p.client || p.name);
        return Array.from(new Set([...contractClients, ...projectClients]));
    }

    /** Clientes que de fato incluem a Head Master no custo (ignora contratos
     *  com includeHeadMaster === false). Assim o salário é dividido só entre
     *  os clientes que realmente usam a Head Master, e a soma total dos
     *  custos bate com o salário cheio dela. */
    _hmClientsInPeriod(periodId, includeProjects = true) {
        const contractClients = storage.getActiveContractsForPeriod(periodId)
            .filter(c => c.includeHeadMaster !== false)
            .map(c => c.client);
        if (!includeProjects) return Array.from(new Set(contractClients));
        const projectClients = projectService.getProjectsForPeriod(periodId).map(p => p.client || p.name);
        return Array.from(new Set([...contractClients, ...projectClients]));
    }

    _clientRevenueAgencyWide(clientName, periodId, includeProjects = true) {
        const contractsRevenue = storage.getActiveContractsForPeriod(periodId)
            .filter(c => c.client === clientName)
            .reduce((sum, c) => sum + (this._getProjectionData(c, periodId).value || 0), 0);
        if (!includeProjects) return contractsRevenue;
        const projectsRevenue = projectService.getProjectsForPeriod(periodId)
            .filter(p => (p.client || p.name) === clientName)
            .reduce((sum, p) => sum + (p.value || 0), 0);
        return contractsRevenue + projectsRevenue;
    }

    getHeadMasterCostForContract(contractId, periodId = null, includeProjects = true) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const headMaster = this.getHeadMaster();
        if (!headMaster) return 0;

        const contract = storage.getContractById(contractId);
        if (!contract) return 0;

        // Se o contrato exclui a Head Master, custo é zero — ponto.
        if (contract.includeHeadMaster === false) return 0;

        const salary = this.getPersonCost(headMaster.id, currentPeriod);
        if (salary === 0) return 0;

        const distinctClients = this._hmClientsInPeriod(currentPeriod, includeProjects);
        if (distinctClients.length === 0) return 0;

        const perClient = salary / distinctClients.length;

        const clientRevenue = this._clientRevenueAgencyWide(contract.client, currentPeriod, includeProjects);
        if (clientRevenue === 0) {
            const clientContracts = storage.getActiveContractsForPeriod(currentPeriod).filter(c => c.client === contract.client && c.includeHeadMaster !== false);
            const clientProjects  = includeProjects
                ? projectService.getProjectsForPeriod(currentPeriod).filter(p => (p.client || p.name) === contract.client)
                : [];
            const sharedCount = clientContracts.length + clientProjects.length;
            return sharedCount <= 1 ? perClient : perClient / sharedCount;
        }

        const thisRevenue = this._getProjectionData(contract, currentPeriod).value || 0;
        return perClient * (thisRevenue / clientRevenue);
    }

    getHeadMasterCostForProject(projectId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const headMaster = this.getHeadMaster();
        if (!headMaster) return 0;

        const project = projectService.getProjectById(projectId);
        if (!project) return 0;

        const salary = this.getPersonCost(headMaster.id, currentPeriod);
        if (salary === 0) return 0;

        const distinctClients = this._hmClientsInPeriod(currentPeriod, true);
        if (distinctClients.length === 0) return 0;

        const perClient = salary / distinctClients.length;
        const clientKey = project.client || project.name;

        const clientRevenue = this._clientRevenueAgencyWide(clientKey, currentPeriod, true);
        if (clientRevenue === 0) {
            const clientContracts = storage.getActiveContractsForPeriod(currentPeriod).filter(c => c.client === clientKey && c.includeHeadMaster !== false);
            const clientProjects  = projectService.getProjectsForPeriod(currentPeriod).filter(p => (p.client || p.name) === clientKey);
            const sharedCount = clientContracts.length + clientProjects.length;
            return sharedCount <= 1 ? perClient : perClient / sharedCount;
        }

        const thisRevenue = project.value || 0;
        return perClient * (thisRevenue / clientRevenue);
    }

    getHeadCostForProject(projectId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const project = projectService.getProjectById(projectId);
        if (!project || !project.squadId) return 0;

        const squad = storage.getSquadById(project.squadId);
        if (!squad || !squad.headId) return 0;

        const headSalary = this.getPersonCost(squad.headId, currentPeriod);
        if (headSalary === 0) return 0;

        const distinctClients = this._squadClientsInPeriod(squad.id, currentPeriod);
        if (distinctClients.length === 0) return 0;

        const headCostPerClient = headSalary / distinctClients.length;
        const clientKey = project.client || project.name;

        const clientRevenue = this._clientRevenueAcrossSquad(squad.id, clientKey, currentPeriod);
        if (clientRevenue === 0) {
            const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);
            const clientContracts = activeContracts.filter(c => c.squadTag === squad.id && c.client === clientKey);
            const clientProjects  = projectService.getProjectsForPeriod(currentPeriod).filter(p => p.squadId === squad.id && (p.client || p.name) === clientKey);
            const sharedCount = clientContracts.length + clientProjects.length;
            return sharedCount <= 1 ? headCostPerClient : headCostPerClient / sharedCount;
        }

        const thisProjectRevenue = project.value || 0;
        return headCostPerClient * (thisProjectRevenue / clientRevenue);
    }

    /**
     * ROI de um projeto pontual: receita (valor do projeto) menos custo
     * externo (informado no lançamento) e rateio automático do Head.
     */
    getProjectROI(projectId, periodId = null) {
        const project = projectService.getProjectById(projectId);
        if (!project) return { revenue: 0, cost: 0, profit: 0, margin: 0, costBreakdown: [] };

        const currentPeriod = periodId || project.billingPeriod || storage.getCurrentPeriod();
        const revenue = project.value || 0;
        const costBreakdown = [];
        let cost = 0;

        const externalCost = project.externalCost || 0;
        if (externalCost > 0) {
            cost += externalCost;
            costBreakdown.push({
                name: project.externalCostNote || 'Custo externo',
                mode: 'externo',
                totalCost: externalCost
            });
        }

        const headCost = this.getHeadCostForProject(project.id, currentPeriod);
        if (headCost > 0) {
            cost += headCost;
            const squad = storage.getSquadById(project.squadId);
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

        const headMasterCost = this.getHeadMasterCostForProject(project.id, currentPeriod);
        if (headMasterCost > 0) {
            cost += headMasterCost;
            const headMaster = this.getHeadMaster();
            if (headMaster) {
                costBreakdown.push({
                    personId: headMaster.id,
                    name: headMaster.name + ' (Head Master)',
                    role: headMaster.role,
                    mode: 'head_master',
                    totalCost: headMasterCost,
                    isHead: true
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

    // ========================================
    // ROI DO CONTRATO
    // ========================================

    getContractROI(contractId, periodId = null, includeProjects = true) {
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
            if (personCost === 0 && (alloc.mode === 'rateado' || alloc.mode === 'founder_brand')) return;

            cost += personCost;

            if (alloc.mode === 'fixo') {
                costBreakdown.push({
                    personId: person.id,
                    name: person.name,
                    role: person.role,
                    mode: 'fixo',
                    totalCost: personCost
                });
            } else if (alloc.mode === 'founder_brand') {
                const reserve = this._personFounderBrandReserve(person.id, currentPeriod);
                costBreakdown.push({
                    personId: person.id,
                    name: person.name,
                    role: person.role,
                    mode: 'founder_brand',
                    totalCost: personCost,
                    reservePct: reserve.pct,
                    fbClientCount: reserve.fbContracts.length
                });
            } else {
                const relevantHere = this._relevantQuantity(person.role, data);
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

        const headCost = this.getHeadCostForContract(contractId, currentPeriod, includeProjects);
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

        // Só inclui Head Master se o contrato não tiver o flag explicitamente desativado
        const shouldIncludeHM = contract.includeHeadMaster !== false;
        if (shouldIncludeHM) {
            const headMasterCost = this.getHeadMasterCostForContract(contractId, currentPeriod, includeProjects);
            if (headMasterCost > 0) {
                cost += headMasterCost;
                const headMaster = this.getHeadMaster();
                if (headMaster) {
                    costBreakdown.push({
                        personId: headMaster.id,
                        name: headMaster.name + ' (Head Master)',
                        role: headMaster.role,
                        mode: 'head_master',
                        totalCost: headMasterCost,
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

    getSquadProjects(squadId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        return projectService.getProjectsForPeriod(currentPeriod).filter(p => p.squadId === squadId);
    }

    getSquadROI(squadId, periodId = null, includeProjects = true) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const contracts = this.getSquadContracts(squadId, currentPeriod);
        const projects  = includeProjects ? this.getSquadProjects(squadId, currentPeriod) : [];
        const squad = storage.getSquadById(squadId);

        if (!squad) {
            return { revenue: 0, cost: 0, profit: 0, margin: 0, contractCount: 0 };
        }

        let totalRevenue = 0;
        let totalCost = 0;

        contracts.forEach(contract => {
            const roi = this.getContractROI(contract.id, currentPeriod, includeProjects);
            totalRevenue += roi.revenue;
            totalCost += roi.cost;
        });

        projects.forEach(project => {
            const roi = this.getProjectROI(project.id, currentPeriod);
            totalRevenue += roi.revenue;
            totalCost += roi.cost;
        });

        return {
            revenue: totalRevenue,
            cost: totalCost,
            profit: totalRevenue - totalCost,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
            contractCount: contracts.length,
            projectCount: projects.length
        };
    }

    // ========================================
    // DRE POR SQUAD
    // ========================================

    getSquadDRE(squadId, periodId = null, includeProjects = true) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const squad = storage.getSquadById(squadId);
        if (!squad) return null;

        const contracts = this.getSquadContracts(squadId, currentPeriod);
        const projects  = includeProjects ? this.getSquadProjects(squadId, currentPeriod) : [];

        const deliverables = contracts.reduce((acc, c) => {
            acc.video += c.videoCount || 0;
            acc.static += c.staticCount || 0;
            if (c.trafficManagement) acc.trafficCount++;
            if (c.founderBrand) acc.founderBrandCount++;
            return acc;
        }, { video: 0, static: 0, trafficCount: 0, founderBrandCount: 0 });

        const revenuePerContract = contracts.map(contract => {
            const roi = this.getContractROI(contract.id, currentPeriod, includeProjects);
            return { contractId: contract.id, client: contract.client, value: roi.revenue };
        });
        const revenuePerProject = projects.map(project => {
            const roi = this.getProjectROI(project.id, currentPeriod);
            return { projectId: project.id, client: project.client || project.name, value: roi.revenue, isProject: true };
        });
        const totalRevenue = revenuePerContract.reduce((s, c) => s + c.value, 0)
                            + revenuePerProject.reduce((s, p) => s + p.value, 0);

        const memberCostMap = {};
        contracts.forEach(contract => {
            const roi = this.getContractROI(contract.id, currentPeriod, includeProjects);
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

        const totalExternalProjectCost = projects.reduce((s, p) => s + (p.externalCost || 0), 0);
        const externalProjectsList = projects
            .filter(p => (p.externalCost || 0) > 0)
            .map(p => ({ projectId: p.id, client: p.client || p.name, cost: p.externalCost || 0 }));

        let totalHeadCost = 0;
        let headData = null;
        if (squad.headId) {
            const head = storage.getPersonById(squad.headId);
            contracts.forEach(contract => {
                totalHeadCost += this.getHeadCostForContract(contract.id, currentPeriod, includeProjects);
            });
            projects.forEach(project => {
                totalHeadCost += this.getHeadCostForProject(project.id, currentPeriod);
            });
            if (head) {
                headData = { personId: head.id, name: head.name, role: head.role, salary: head.salary, cost: totalHeadCost };
            }
        }

        let totalHeadMasterCost = 0;
        let headMasterData = null;
        const headMaster = this.getHeadMaster();
        if (headMaster) {
            contracts.forEach(contract => {
                totalHeadMasterCost += this.getHeadMasterCostForContract(contract.id, currentPeriod, includeProjects);
            });
            projects.forEach(project => {
                totalHeadMasterCost += this.getHeadMasterCostForProject(project.id, currentPeriod);
            });
            if (totalHeadMasterCost > 0) {
                headMasterData = { personId: headMaster.id, name: headMaster.name, role: headMaster.role, salary: headMaster.salary, cost: totalHeadMasterCost };
            }
        }

        const totalCost = totalMembersCost + totalHeadCost + totalHeadMasterCost + totalExternalProjectCost;
        const grossProfit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        return {
            squadId,
            squadName: squad.name,
            squadIcon: squad.icon || null,
            squadDescription: squad.description || '',
            deliverables,
            revenue: { total: totalRevenue, perContract: revenuePerContract, perProject: revenuePerProject },
            costs: {
                total: totalCost,
                members: memberCosts,
                totalMembers: totalMembersCost,
                head: headData,
                totalHead: totalHeadCost,
                headMaster: headMasterData,
                totalHeadMaster: totalHeadMasterCost,
                totalExternalProjects: totalExternalProjectCost,
                externalProjectsList
            },
            grossProfit,
            margin,
            contractCount: contracts.length,
            projectCount: projects.length,
            // Pessoas de fato listadas no detalhamento (equipe + head + head
            // master) — não o roster oficial do squad (squad.members), que
            // pode estar desatualizado em relação a quem realmente aparece
            // com custo aqui (ex: alguém alocado num contrato sem ter sido
            // formalmente adicionado como membro do squad).
            memberCount: memberCosts.length + (headData ? 1 : 0) + (headMasterData ? 1 : 0)
        };
    }

    getAllSquadsDRE(periodId = null, includeProjects = true) {
        return storage.getSquads().map(sq => this.getSquadDRE(sq.id, periodId, includeProjects));
    }

    getSquadComparison(periodId = null, includeProjects = true) {
        return storage.getSquads().map(squad => {
            const roi = this.getSquadROI(squad.id, periodId, includeProjects);
            return {
                id: squad.id,
                name: squad.name,
                icon: squad.icon,
                ...roi,
                memberCount: squad.members.length
            };
        });
    }

    // ========================================
    // ROI GERAL
    // ========================================

    getOverallROI(periodId = null, includeProjects = true) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const activeContracts = storage.getActiveContractsForPeriod(currentPeriod);
        const activeProjects  = includeProjects ? projectService.getProjectsForPeriod(currentPeriod) : [];

        let totalRevenue = 0;
        let totalCost = 0;

        activeContracts.forEach(contract => {
            const roi = this.getContractROI(contract.id, currentPeriod, includeProjects);
            totalRevenue += roi.revenue;
            totalCost += roi.cost;
        });

        activeProjects.forEach(project => {
            const roi = this.getProjectROI(project.id, currentPeriod);
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

    getMonthOverMonthComparison(periodId = null, includeProjects = true) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const [year, month] = currentPeriod.split('-').map(Number);
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear  = month === 1 ? year - 1 : year;
        const previousPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        const current  = this.getOverallROI(currentPeriod, includeProjects);
        const previous = this.getOverallROI(previousPeriod, includeProjects);

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

    /**
     * Perfil de entregas de uma pessoa, já adaptado ao cargo — fonte única
     * pra tela de Pessoas (resolve a divergência entre "Entreg." e "Tipo de
     * Entrega" que existia antes, já que cada um vinha de um cálculo diferente).
     *
     * - Head: não tem peopleAllocations (custo automático) — "contrato" aqui
     *   é o número de clientes (contratos + projetos) do(s) squad(s) que lidera.
     * - Gestor de Tráfego: a unidade dele é "1 por contrato de tráfego", não
     *   vídeo/estático — mostra quantos contratos de tráfego.
     * - Filmmaker/Designer: só o que é deles (vídeo ou estático).
     * - Copywriter e demais: vídeo + estático juntos.
     * - Qualquer cargo: se tiver alocação 'founder_brand', mostra também
     *   quantos clientes Founder Brand, separado do resto.
     */
    getPersonDeliveryProfile(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const person = storage.getPersonById(personId);
        if (!person) {
            return { kind: 'generic', contractCount: 0, video: 0, static: 0, total: 0, founderBrandClients: 0, fixedCount: 0, fixedTotal: 0 };
        }

        const headSquads = storage.getSquads().filter(s => s.headId === personId);
        if (headSquads.length > 0) {
            let clientCount = 0;
            headSquads.forEach(squad => {
                clientCount += this._squadClientsInPeriod(squad.id, currentPeriod).length;
            });
            return { kind: 'head', contractCount: clientCount, video: 0, static: 0, total: clientCount, founderBrandClients: 0, fixedCount: 0, fixedTotal: 0 };
        }

        if (person.role === 'Head Master') {
            const clientCount = this._allClientsInPeriod(currentPeriod).length;
            return { kind: 'head_master', contractCount: clientCount, video: 0, static: 0, total: clientCount, founderBrandClients: 0, fixedCount: 0, fixedTotal: 0 };
        }

        const contracts = this.getPersonContractsForPeriod(personId, currentPeriod);
        const contractCount = contracts.length;

        // Total recebido por valor fixo — usado só como respaldo do Custo/Ent
        // quando não há nenhum criativo real pra dividir (ex.: retainer fixo
        // sem vídeo/estático lançado). O volume de entrega em si (abaixo) já
        // conta contratos fixos igual aos rateados — pagamento é uma coisa,
        // quantidade entregue é outra, e mostrar as duas juntas só repetia
        // Contr./Custo-Ent com outras palavras.
        let fixedCount = 0;
        let fixedTotal = 0;
        contracts.forEach(contract => {
            const data = this._getProjectionData(contract, currentPeriod);
            const alloc = data.peopleAllocations.find(a => a.personId === personId);
            if (alloc && alloc.mode === 'fixo') {
                fixedCount++;
                fixedTotal += alloc.fixedValue || 0;
            }
        });

        if (person.role === 'Gestor de Tráfego') {
            const trafficCount = contracts.filter(contract => {
                const data = this._getProjectionData(contract, currentPeriod);
                const alloc = data.peopleAllocations.find(a => a.personId === personId);
                return alloc && (alloc.mode === 'rateado' || alloc.mode === 'fixo') && data.trafficManagement;
            }).length;
            return { kind: 'traffic', contractCount, video: 0, static: 0, total: trafficCount, founderBrandClients: 0, fixedCount, fixedTotal };
        }

        let video = 0;
        let estatico = 0;
        let founderBrandClients = 0;

        contracts.forEach(contract => {
            const data = this._getProjectionData(contract, currentPeriod);
            const alloc = data.peopleAllocations.find(a => a.personId === personId);
            if (!alloc) return;

            if (alloc.mode === 'founder_brand') {
                founderBrandClients++;
                return;
            }
            // Conta vídeo/estático tanto de rateado quanto de fixo — a
            // quantidade de criativos entregues não depende de como a
            // pessoa é paga por eles.
            if (alloc.mode !== 'rateado' && alloc.mode !== 'fixo') return;

            if (person.role === 'Filmmaker') {
                video += data.videoCount || 0;
            } else if (person.role === 'Designer') {
                estatico += data.staticCount || 0;
            } else {
                video    += data.videoCount  || 0;
                estatico += data.staticCount || 0;
            }
        });

        return {
            kind: 'content',
            contractCount,
            video,
            static: estatico,
            total: video + estatico,
            founderBrandClients,
            fixedCount,
            fixedTotal
        };
    }

    getPersonAverageTicket(personId, periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();

        const headSquads = storage.getSquads().filter(s => s.headId === personId);
        if (headSquads.length > 0) {
            let totalValue = 0;
            let count = 0;
            headSquads.forEach(squad => {
                this.getSquadContracts(squad.id, currentPeriod).forEach(contract => {
                    totalValue += this._getProjectionData(contract, currentPeriod).value || 0;
                    count++;
                });
                this.getSquadProjects(squad.id, currentPeriod).forEach(project => {
                    totalValue += project.value || 0;
                    count++;
                });
            });
            return count > 0 ? totalValue / count : 0;
        }

        const headMaster = this.getHeadMaster();
        if (headMaster && headMaster.id === personId) {
            let totalValue = 0;
            let count = 0;
            storage.getActiveContractsForPeriod(currentPeriod).forEach(contract => {
                totalValue += this._getProjectionData(contract, currentPeriod).value || 0;
                count++;
            });
            projectService.getProjectsForPeriod(currentPeriod).forEach(project => {
                totalValue += project.value || 0;
                count++;
            });
            return count > 0 ? totalValue / count : 0;
        }

        const contracts = this.getPersonContractsForPeriod(personId, periodId);
        if (contracts.length === 0) return 0;
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
            const salary  = this.getPersonCost(person.id, currentPeriod);
            const profile = this.getPersonDeliveryProfile(person.id, currentPeriod);

            return {
                id: person.id,
                name: person.name,
                role: person.role,
                salary,
                totalDeliverables: profile.total,
                deliveryKind: profile.kind, // 'head' | 'traffic' | 'content'
                costPerDeliverable: this.getPersonCostPerDeliverable(person.id, currentPeriod),
                contractCount: profile.contractCount,
                averageTicket: this.getPersonAverageTicket(person.id, currentPeriod)
            };
        });
    }

    /**
     * Ranking unificado de lucratividade — contratos recorrentes E projetos
     * pontuais juntos, cada um marcado com seu tipo. Substitui o ranking
     * antigo que ignorava projetos por completo.
     */
    getEngagementProfitabilityRanking(periodId = null, includeProjects = true) {
        const currentPeriod = periodId || storage.getCurrentPeriod();

        const contracts = storage.getActiveContractsForPeriod(currentPeriod).map(c => {
            const roi = this.getContractROI(c.id, currentPeriod, includeProjects);
            return { id: c.id, client: c.client, type: 'recorrente', revenue: roi.revenue, cost: roi.cost, profit: roi.profit, margin: roi.margin };
        });

        const projects = includeProjects ? projectService.getProjectsForPeriod(currentPeriod).map(p => {
            const roi = this.getProjectROI(p.id, currentPeriod);
            return { id: p.id, client: p.client || p.name, type: 'pontual', revenue: roi.revenue, cost: roi.cost, profit: roi.profit, margin: roi.margin };
        }) : [];

        return [...contracts, ...projects].sort((a, b) => b.profit - a.profit);
    }

    /**
     * Resumo de Founder Brand pra um painel rápido no Dashboard: quantos
     * clientes, receita deles, e quanto do salário da equipe está reservado.
     */
    getFounderBrandSummary(periodId = null) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const fbContracts = storage.getActiveContractsForPeriod(currentPeriod).filter(c => c.founderBrand);
        const clients = new Set(fbContracts.map(c => c.client));
        const revenue = fbContracts.reduce((s, c) => s + (this._getProjectionData(c, currentPeriod).value || 0), 0);

        let reserveTotal = 0;
        storage.getPeople()
            .filter(p => (p.founderBrandPercent || 0) > 0)
            .forEach(p => { reserveTotal += this._personFounderBrandReserve(p.id, currentPeriod).reserveTotal; });

        return { clientCount: clients.size, revenue, reserveTotal };
    }

    comparePeopleByRole(role, periodId = null) {
        return this.getProductivityRanking(periodId).filter(p => p.role === role);
    }

    // ========================================
    // SIMULADOR DE MARGEM
    // ========================================

    /**
     * Simula a margem de um contrato — em dois modos:
     *
     * - 'new' (cliente novo): calcula o custo MARGINAL de somar esse
     *   contrato ao que já existe hoje (mais um cliente na divisão do
     *   Head/Head Master, mais entregáveis na pool de rateio de cada
     *   pessoa).
     *
     * - 'existing' (cliente existente): EDITA um contrato real — remove a
     *   contribuição ATUAL desse contrato específico de todos os cálculos
     *   antes de somar os valores simulados. Carregando os dados reais sem
     *   mudar nada, o resultado bate exatamente com a margem desse contrato
     *   na tela de Contratos (é o mesmo cálculo, só que hipotético).
     *
     * Não escreve nada no storage — é só leitura, pura simulação.
     *
     * params:
     *   squadId            - squad escolhido
     *   clientMode         - 'new' ou 'existing'
     *   existingContractId - obrigatório se clientMode === 'existing'
     *   value              - valor do contrato simulado
     *   videoCount, staticCount, trafficManagement, founderBrand
     *   assignments        - [{ personId, mode: 'rateado' | 'fixo' | 'founder_brand', fixedValue? }]
     *                        (Head e Head Master entram automaticamente, não precisa incluir)
     *
     * includeProjects (3º argumento da função): se false, tanto o cálculo do
     * Head/Head Master quanto os benchmarks de comparação (squad e agência)
     * ignoram projetos pontuais — útil pra avaliar a margem do contrato só
     * contra a recorrência.
     */
    simulateContractMargin(params, periodId = null, includeProjects = true) {
        const currentPeriod = periodId || storage.getCurrentPeriod();
        const squad = storage.getSquadById(params.squadId);
        if (!squad) throw new Error('Squad não encontrado');

        const data = {
            value: params.value || 0,
            videoCount: params.videoCount || 0,
            staticCount: params.staticCount || 0,
            trafficManagement: !!params.trafficManagement,
        };

        const isExisting = params.clientMode === 'existing' && params.existingContractId;
        const oldContract = isExisting ? storage.getContractById(params.existingContractId) : null;
        const oldData = oldContract ? this._getProjectionData(oldContract, currentPeriod) : null;

        const costBreakdown = [];
        let totalCost = 0;

        // ── Pessoas selecionadas (rateado / fixo / founder_brand) ──
        (params.assignments || []).forEach(({ personId, mode, fixedValue }) => {
            const person = storage.getPersonById(personId);
            if (!person) return;

            let cost = 0;

            if (mode === 'fixo') {
                // Valor fixo não depende de rateio nenhum — é literalmente o
                // valor negociado, igual no sistema real.
                cost = fixedValue || 0;
            } else if (mode === 'founder_brand') {
                const salary = this.getPersonCost(personId, currentPeriod);
                const pct = person.founderBrandPercent || 0;
                const reserveTotal = salary * (pct / 100);

                // Se a pessoa já tinha esse MESMO contrato em modo founder_brand,
                // remove ele da contagem antes de somar o simulado de volta —
                // senão contaria duas vezes o mesmo contrato.
                let currentFbCount = this._founderBrandContractsForPerson(personId, currentPeriod).length;
                if (oldContract) {
                    const oldAlloc = (oldData.peopleAllocations || []).find(a => a.personId === personId);
                    if (oldAlloc && oldAlloc.mode === 'founder_brand') currentFbCount -= 1;
                }
                const newFbCount = currentFbCount + 1;
                cost = newFbCount > 0 ? reserveTotal / newFbCount : 0;
            } else {
                const relevantNew = this._relevantQuantity(person.role, data);
                if (relevantNew > 0) {
                    const salary = this.getPersonCost(personId, currentPeriod);
                    const reserve = this._personFounderBrandReserve(personId, currentPeriod);
                    const availableSalary = salary - reserve.reserveTotal;

                    // Remove a contribuição ATUAL desse contrato específico
                    // (se a pessoa já estava alocada em modo rateado nele)
                    // antes de somar o valor simulado — assim "editar sem
                    // mudar nada" reproduz exatamente o número real.
                    let currentRateable = this.getPersonTotalRateableDeliverables(personId, currentPeriod);
                    if (oldContract) {
                        const oldAlloc = (oldData.peopleAllocations || []).find(a => a.personId === personId);
                        if (oldAlloc && oldAlloc.mode === 'rateado') {
                            currentRateable -= this._relevantQuantity(person.role, oldData);
                        }
                    }

                    const newTotalRateable = currentRateable + relevantNew;
                    cost = newTotalRateable > 0 ? (relevantNew / newTotalRateable) * availableSalary : 0;
                }
            }

            if (cost > 0) {
                totalCost += cost;
                costBreakdown.push({ personId, name: person.name, role: person.role, mode, cost });
            }
        });

        // ── Head do squad (automático) ──
        if (squad.headId) {
            const head = storage.getPersonById(squad.headId);
            if (head) {
                const headCost = this._simulateClientShareCost(
                    head.id, currentPeriod, params.value,
                    () => this._squadClientsInPeriod(squad.id, currentPeriod, includeProjects),
                    (clientName) => this._clientRevenueAcrossSquad(squad.id, clientName, currentPeriod, includeProjects),
                    params.clientMode, oldContract
                );
                costBreakdown.push({ personId: head.id, name: head.name + ' (Head)', role: head.role, mode: 'head', cost: headCost });
                totalCost += headCost;
            }
        }

        // ── Head Master (automático, agência toda) ──
        const headMaster = this.getHeadMaster();
        if (headMaster) {
            const hmCost = this._simulateClientShareCost(
                headMaster.id, currentPeriod, params.value,
                () => this._allClientsInPeriod(currentPeriod, includeProjects),
                (clientName) => this._clientRevenueAgencyWide(clientName, currentPeriod, includeProjects),
                params.clientMode, oldContract
            );
            costBreakdown.push({ personId: headMaster.id, name: headMaster.name + ' (Head Master)', role: headMaster.role, mode: 'head_master', cost: hmCost });
            totalCost += hmCost;
        }

        const revenue = params.value || 0;
        const profit  = revenue - totalCost;
        const margin  = revenue > 0 ? (profit / revenue) * 100 : 0;

        const squadDRE   = this.getSquadDRE(squad.id, currentPeriod, includeProjects);
        const overallROI = this.getOverallROI(currentPeriod, includeProjects);

        return {
            revenue,
            cost: totalCost,
            profit,
            margin,
            costBreakdown,
            squad: { id: squad.id, name: squad.name, icon: squad.icon, currentMargin: squadDRE ? squadDRE.margin : 0 },
            agency: { currentMargin: overallROI.margin },
            vsSquad:  margin - (squadDRE ? squadDRE.margin : 0),
            vsAgency: margin - overallROI.margin,
        };
    }

    /**
     * Calcula a fatia do custo de um Head/Head Master que cairia no
     * contrato simulado.
     *
     * - Cliente novo: mais um cliente entra na divisão.
     * - Cliente existente (editando um contrato real): a divisão por
     *   cliente não muda, mas a receita desse cliente é recalculada
     *   removendo o valor ANTIGO do contrato sendo editado e somando o
     *   valor SIMULADO no lugar — assim "editar sem mudar nada" reproduz
     *   exatamente a fatia real de hoje.
     */
    _simulateClientShareCost(personId, periodId, simulatedValue, getClients, getClientRevenue, clientMode, oldContract) {
        const salary = this.getPersonCost(personId, periodId);
        if (salary === 0) return 0;

        const clients = getClients();

        if (clientMode !== 'existing' || !oldContract) {
            const newCount = clients.length + 1;
            return salary / newCount;
        }

        const count = clients.length || 1;
        const perClient = salary / count;
        const totalClientRevenue = getClientRevenue(oldContract.client);
        const adjustedRevenue = totalClientRevenue - (oldContract.value || 0);
        const newTotalRevenue = adjustedRevenue + simulatedValue;
        if (newTotalRevenue === 0) return 0;
        return perClient * (simulatedValue / newTotalRevenue);
    }

    /**
     * Série dos últimos N meses (mais antigo → mais recente, terminando no
     * período atual), com receita/custo/lucro/margem de cada mês. Usado
     * pela página de Evolução.
     */
    getMonthlyEvolution(months = 6, includeProjects = true) {
        const currentPeriod = storage.getCurrentPeriod();
        const periodIds = [];
        let cursor = currentPeriod;

        for (let i = 0; i < months; i++) {
            periodIds.unshift(cursor);
            const [year, month] = cursor.split('-').map(Number);
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear  = month === 1 ? year - 1 : year;
            cursor = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
        }

        return periodIds.map(periodId => {
            const roi = this.getOverallROI(periodId, includeProjects);
            const period = storage.getPeriod(periodId);
            return {
                periodId,
                label: period ? period.label : periodId,
                revenue: roi.revenue,
                cost: roi.cost,
                profit: roi.profit,
                margin: roi.margin
            };
        });
    }

    /**
     * Alias de getMonthOverMonthComparison — usado pela página de Evolução.
     */
    compareWithPreviousMonth(periodId = null, includeProjects = true) {
        return this.getMonthOverMonthComparison(periodId, includeProjects);
    }
}

export default new AnalyticsService();
