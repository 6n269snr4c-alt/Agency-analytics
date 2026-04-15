// deliverableTypeService.js - Deliverable types with role composition

import storage from '../store/storage.js';

class DeliverableTypeService {
    constructor() {
        // Predefined roles
        this.AVAILABLE_ROLES = [
            'Designer',
            'Copywriter',
            'Editor de Vídeo',
            'Gestor de Tráfego',
            'Head Executivo',
            'Head Criativo',
            'Filmmaker',
            'Fotógrafo',
            'Motion Designer',
            'Estrategista',
            'Social Media'
        ];
    }

    getAvailableRoles() {
        return this.AVAILABLE_ROLES;
    }

    createDeliverableType(typeData) {
        if (!typeData.name) {
            throw new Error('Nome do tipo de entregável é obrigatório');
        }

        if (!typeData.roles || typeData.roles.length === 0) {
            throw new Error('Pelo menos um cargo deve estar envolvido');
        }

        // Validate roles
        const invalidRoles = typeData.roles.filter(
            role => !this.AVAILABLE_ROLES.includes(role)
        );
        
        if (invalidRoles.length > 0) {
            throw new Error(`Cargos inválidos: ${invalidRoles.join(', ')}`);
        }

        const deliverableType = storage.addDeliverableType({
            name: typeData.name,
            roles: typeData.roles, // Array of role names
            description: typeData.description || '',
            active: true
        });

        return deliverableType;
    }

    updateDeliverableType(id, updates) {
        const type = storage.getDeliverableTypeById(id);
        if (!type) {
            throw new Error('Tipo de entregável não encontrado');
        }

        if (updates.roles) {
            const invalidRoles = updates.roles.filter(
                role => !this.AVAILABLE_ROLES.includes(role)
            );
            
            if (invalidRoles.length > 0) {
                throw new Error(`Cargos inválidos: ${invalidRoles.join(', ')}`);
            }
        }

        return storage.updateDeliverableType(id, updates);
    }

    deleteDeliverableType(id) {
        // Check if any contract is using this type
        const contracts = storage.getContracts();
        const isUsed = contracts.some(contract => {
            if (!contract.deliverables) return false;
            return Object.keys(contract.deliverables).includes(id);
        });

        if (isUsed) {
            throw new Error('Não é possível excluir um tipo de entregável que está sendo usado em contratos');
        }

        return storage.deleteDeliverableType(id);
    }

    getDeliverableType(id) {
        return storage.getDeliverableTypeById(id);
    }

    getAllDeliverableTypes() {
        return storage.getDeliverableTypes();
    }

    getActiveDeliverableTypes() {
        const types = storage.getDeliverableTypes();
        return types.filter(type => type.active !== false);
    }

    // Get all people involved in a specific deliverable type
    getInvolvedRoles(typeId) {
        const type = storage.getDeliverableTypeById(typeId);
        return type ? type.roles : [];
    }

    // Check if a role is involved in a deliverable type
    isRoleInvolved(typeId, roleName) {
        const type = storage.getDeliverableTypeById(typeId);
        if (!type) return false;
        return type.roles.includes(roleName);
    }

    // Get distribution of deliverables by role
    getDeliverableDistributionByRole(contractId) {
        const contract = storage.getContractById(contractId);
        if (!contract || !contract.deliverables) return {};

        const distribution = {};

        Object.entries(contract.deliverables).forEach(([typeId, quantity]) => {
            const type = this.getDeliverableType(typeId);
            if (!type) return;

            type.roles.forEach(role => {
                if (!distribution[role]) {
                    distribution[role] = {
                        role,
                        total: 0,
                        byType: {}
                    };
                }
                
                distribution[role].total += quantity;
                
                if (!distribution[role].byType[type.name]) {
                    distribution[role].byType[type.name] = 0;
                }
                distribution[role].byType[type.name] += quantity;
            });
        });

        return distribution;
    }

    // Calculate how many deliverables a person is involved in
    getPersonDeliverableCount(personId, contractId) {
        const person = storage.getPersonById(personId);
        if (!person) return 0;

        const distribution = this.getDeliverableDistributionByRole(contractId);
        const roleDistribution = distribution[person.role];

        return roleDistribution ? roleDistribution.total : 0;
    }

    // Get detailed breakdown of deliverables for a person
    getPersonDeliverableBreakdown(personId) {
        const person = storage.getPersonById(personId);
        if (!person) return { total: 0, byType: {}, byContract: {} };

        const contracts = storage.getContracts().filter(contract => {
            if (contract.assignedPeople && contract.assignedPeople.includes(personId)) {
                return true;
            }
            if (contract.squadId) {
                const squad = storage.getSquadById(contract.squadId);
                return squad && squad.members.includes(personId);
            }
            return false;
        });

        const breakdown = {
            total: 0,
            byType: {},
            byContract: {}
        };

        contracts.forEach(contract => {
            const distribution = this.getDeliverableDistributionByRole(contract.id);
            const roleData = distribution[person.role];

            if (roleData) {
                breakdown.total += roleData.total;
                
                // Aggregate by type
                Object.entries(roleData.byType).forEach(([typeName, count]) => {
                    if (!breakdown.byType[typeName]) {
                        breakdown.byType[typeName] = 0;
                    }
                    breakdown.byType[typeName] += count;
                });

                // Track by contract
                breakdown.byContract[contract.client] = {
                    total: roleData.total,
                    byType: roleData.byType
                };
            }
        });

        return breakdown;
    }
}

export default new DeliverableTypeService();
