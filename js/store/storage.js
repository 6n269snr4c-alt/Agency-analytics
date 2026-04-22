// ============================================
// STORAGE SERVICE - Agency Analytics v2
// Camada de persistência com localStorage
// ============================================

class StorageService {
    constructor() {
        this.KEYS = {
            PEOPLE: 'agency_people',
            CONTRACTS: 'agency_contracts',
            SQUADS: 'agency_squads',
            ROLES: 'agency_roles',
            DELIVERABLE_TYPES: 'agency_deliverable_types',
            CURRENT_PERIOD: 'agency_current_period'
        };
        
        // Inicializa dados padrão se necessário
        this.initializeDefaults();
    }

    // ========================================
    // INICIALIZAÇÃO
    // ========================================
    
    initializeDefaults() {
        // Importa defaults dos models
        import('../models/dataModels.js').then(module => {
            // Inicializa tipos de entregáveis se não existirem
            if (!this.getDeliverableTypes().length) {
                this.saveDeliverableTypes(module.DEFAULT_DELIVERABLE_TYPES);
            }
            
            // Inicializa funções se não existirem
            if (!this.getRoles().length) {
                const defaultRoles = module.DEFAULT_ROLES.map((name, index) => ({
                    id: `role_${Date.now()}_${index}`,
                    name,
                    deliverableWeights: {},
                    description: ''
                }));
                this.saveRoles(defaultRoles);
            }
            
            // Inicializa período atual se não existir
            if (!this.getCurrentPeriod()) {
                const now = new Date();
                const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                this.setCurrentPeriod(period);
            }
        });
    }

    // ========================================
    // HELPERS
    // ========================================
    
    _get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Erro ao ler ${key}:`, error);
            return [];
        }
    }

    _set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Erro ao salvar ${key}:`, error);
            return false;
        }
    }

    _generateId(prefix = 'item') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ========================================
    // PERÍODO
    // ========================================
    
    getCurrentPeriod() {
        return localStorage.getItem(this.KEYS.CURRENT_PERIOD) || '';
    }

    setCurrentPeriod(period) {
        localStorage.setItem(this.KEYS.CURRENT_PERIOD, period);
        // Dispara evento customizado para atualizar UI
        window.dispatchEvent(new CustomEvent('periodChanged', { detail: { period } }));
    }

    // Retorna contratos agrupados por período (para migração)
    getContractsPerPeriod() {
        const key = 'agency_contracts_per_period';
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    // Salva contratos para um período específico (para migração)
    saveContractsForPeriod(period, contracts) {
        const key = 'agency_contracts_per_period';
        try {
            const allPeriods = this.getContractsPerPeriod();
            const existingIndex = allPeriods.findIndex(p => p.period === period);
            
            if (existingIndex >= 0) {
                allPeriods[existingIndex] = { period, contracts };
            } else {
                allPeriods.push({ period, contracts });
            }
            
            localStorage.setItem(key, JSON.stringify(allPeriods));
            
            // Também salva nos contratos normais com período
            const contractsWithPeriod = contracts.map(c => ({ ...c, period }));
            this.saveContracts(contractsWithPeriod);
            
            return true;
        } catch (error) {
            console.error('Erro ao salvar contratos por período:', error);
            return false;
        }
    }

    // ========================================
    // TIPOS DE ENTREGÁVEIS
    // ========================================
    
    getDeliverableTypes() {
        return this._get(this.KEYS.DELIVERABLE_TYPES);
    }

    getDeliverableTypeById(id) {
        return this.getDeliverableTypes().find(dt => dt.id === id);
    }

    saveDeliverableTypes(deliverableTypes) {
        return this._set(this.KEYS.DELIVERABLE_TYPES, deliverableTypes);
    }

    addDeliverableType(deliverableType) {
        const deliverableTypes = this.getDeliverableTypes();
        const newDeliverableType = {
            ...deliverableType,
            id: deliverableType.id || this._generateId('deliverable')
        };
        deliverableTypes.push(newDeliverableType);
        this.saveDeliverableTypes(deliverableTypes);
        return newDeliverableType;
    }

    updateDeliverableType(id, updates) {
        const deliverableTypes = this.getDeliverableTypes();
        const index = deliverableTypes.findIndex(dt => dt.id === id);
        if (index !== -1) {
            deliverableTypes[index] = { ...deliverableTypes[index], ...updates };
            this.saveDeliverableTypes(deliverableTypes);
            return deliverableTypes[index];
        }
        return null;
    }

    deleteDeliverableType(id) {
        const deliverableTypes = this.getDeliverableTypes();
        const filtered = deliverableTypes.filter(dt => dt.id !== id);
        this.saveDeliverableTypes(filtered);
        return filtered.length < deliverableTypes.length;
    }

    // ========================================
    // FUNÇÕES (ROLES)
    // ========================================
    
    getRoles() {
        return this._get(this.KEYS.ROLES);
    }

    getRoleById(id) {
        return this.getRoles().find(r => r.id === id);
    }

    getRoleByName(name) {
        return this.getRoles().find(r => r.name === name);
    }

    saveRoles(roles) {
        return this._set(this.KEYS.ROLES, roles);
    }

    addRole(role) {
        const roles = this.getRoles();
        const newRole = {
            ...role,
            id: role.id || this._generateId('role'),
            deliverableWeights: role.deliverableWeights || {}
        };
        roles.push(newRole);
        this.saveRoles(roles);
        return newRole;
    }

    updateRole(id, updates) {
        const roles = this.getRoles();
        const index = roles.findIndex(r => r.id === id);
        if (index !== -1) {
            roles[index] = { ...roles[index], ...updates };
            this.saveRoles(roles);
            return roles[index];
        }
        return null;
    }

    deleteRole(id) {
        const roles = this.getRoles();
        const filtered = roles.filter(r => r.id !== id);
        this.saveRoles(filtered);
        return filtered.length < roles.length;
    }

    // Atualiza o peso de um tipo de entregável para uma função específica
    setRoleDeliverableWeight(roleId, deliverableTypeId, weight) {
        const role = this.getRoleById(roleId);
        if (!role) return null;
        
        if (!role.deliverableWeights) {
            role.deliverableWeights = {};
        }
        
        role.deliverableWeights[deliverableTypeId] = weight;
        return this.updateRole(roleId, role);
    }

    // Pega o peso de um tipo de entregável para uma função
    getRoleDeliverableWeight(roleId, deliverableTypeId) {
        const role = this.getRoleById(roleId);
        if (!role || !role.deliverableWeights) {
            // Retorna peso padrão do tipo de entregável
            const deliverableType = this.getDeliverableTypeById(deliverableTypeId);
            return deliverableType ? deliverableType.defaultWeight : 1;
        }
        
        return role.deliverableWeights[deliverableTypeId] || 
               this.getDeliverableTypeById(deliverableTypeId)?.defaultWeight || 1;
    }

    // ========================================
    // PESSOAS
    // ========================================
    
    getPeople() {
        return this._get(this.KEYS.PEOPLE);
    }

    getPersonById(id) {
        return this.getPeople().find(p => p.id === id);
    }

    savePeople(people) {
        return this._set(this.KEYS.PEOPLE, people);
    }

    addPerson(person) {
        const people = this.getPeople();
        const newPerson = {
            ...person,
            id: person.id || this._generateId('person'),
            deliverables: person.deliverables || {},
            squadAllocations: person.squadAllocations || []
        };
        people.push(newPerson);
        this.savePeople(people);
        return newPerson;
    }

    updatePerson(id, updates) {
        const people = this.getPeople();
        const index = people.findIndex(p => p.id === id);
        if (index !== -1) {
            people[index] = { ...people[index], ...updates };
            this.savePeople(people);
            return people[index];
        }
        return null;
    }

    deletePerson(id) {
        const people = this.getPeople();
        const filtered = people.filter(p => p.id !== id);
        this.savePeople(filtered);
        return filtered.length < people.length;
    }

    // ========================================
    // CONTRATOS
    // ========================================
    
    getContracts() {
        return this._get(this.KEYS.CONTRACTS);
    }

    getContractById(id) {
        return this.getContracts().find(c => c.id === id);
    }

    saveContracts(contracts) {
        return this._set(this.KEYS.CONTRACTS, contracts);
    }

    addContract(contract) {
        const contracts = this.getContracts();
        const newContract = {
            ...contract,
            id: contract.id || this._generateId('contract'),
            deliverables: contract.deliverables || {},
            assignedPeople: contract.assignedPeople || [],
            period: contract.period || this.getCurrentPeriod()
        };
        contracts.push(newContract);
        this.saveContracts(contracts);
        return newContract;
    }

    updateContract(id, updates) {
        const contracts = this.getContracts();
        const index = contracts.findIndex(c => c.id === id);
        if (index !== -1) {
            contracts[index] = { ...contracts[index], ...updates };
            this.saveContracts(contracts);
            return contracts[index];
        }
        return null;
    }

    deleteContract(id) {
        const contracts = this.getContracts();
        const filtered = contracts.filter(c => c.id !== id);
        this.saveContracts(filtered);
        return filtered.length < contracts.length;
    }

    // Filtra contratos por período
    getContractsByPeriod(period) {
        return this.getContracts().filter(c => c.period === period);
    }

    // ========================================
    // SQUADS
    // ========================================
    
    getSquads() {
        return this._get(this.KEYS.SQUADS);
    }

    getSquadById(id) {
        return this.getSquads().find(s => s.id === id);
    }

    saveSquads(squads) {
        return this._set(this.KEYS.SQUADS, squads);
    }

    addSquad(squad) {
        const squads = this.getSquads();
        const newSquad = {
            ...squad,
            id: squad.id || this._generateId('squad'),
            members: squad.members || [],
            contracts: squad.contracts || []
        };
        squads.push(newSquad);
        this.saveSquads(squads);
        return newSquad;
    }

    updateSquad(id, updates) {
        const squads = this.getSquads();
        const index = squads.findIndex(s => s.id === id);
        if (index !== -1) {
            squads[index] = { ...squads[index], ...updates };
            this.saveSquads(squads);
            return squads[index];
        }
        return null;
    }

    deleteSquad(id) {
        const squads = this.getSquads();
        const filtered = squads.filter(s => s.id !== id);
        this.saveSquads(filtered);
        return filtered.length < squads.length;
    }

    // ========================================
    // UTILITÁRIOS
    // ========================================
    
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        this.initializeDefaults();
    }

    exportData() {
        const data = {};
        Object.entries(this.KEYS).forEach(([key, storageKey]) => {
            data[key] = this._get(storageKey);
        });
        return data;
    }

    importData(data) {
        Object.entries(data).forEach(([key, value]) => {
            if (this.KEYS[key]) {
                this._set(this.KEYS[key], value);
            }
        });
    }
}

// Exporta instância singleton
export default new StorageService();
