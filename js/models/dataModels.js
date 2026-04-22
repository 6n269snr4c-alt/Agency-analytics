// ============================================
// DATA MODELS - Agency Analytics v2
// Sistema de Pesos por Função
// ============================================

/**
 * Modelo de Tipo de Entregável
 */
export const DeliverableTypeModel = {
    id: '',           // ID único
    name: '',         // Nome (ex: "Criativo Estático", "Vídeo Editado", "Clipe")
    roles: [],        // Array de funções necessárias (ex: ["Designer", "Copywriter"])
    defaultWeight: 1, // Peso padrão (pode ser sobrescrito por função)
    description: ''   // Descrição opcional
};

/**
 * Modelo de Função (Role)
 */
export const RoleModel = {
    id: '',                    // ID único
    name: '',                  // Nome da função (ex: "Designer", "Filmmaker")
    deliverableWeights: {},    // Objeto { deliverableTypeId: peso }
    description: ''            // Descrição da função
};

/**
 * Modelo de Pessoa
 */
export const PersonModel = {
    id: '',
    name: '',
    role: '',           // ID da função
    salary: 0,
    deliverables: {},   // Objeto { deliverableTypeId: quantidade }
    squadAllocations: [] // Array de { squadId, percentage }
};

/**
 * Modelo de Contrato
 */
export const ContractModel = {
    id: '',
    clientName: '',
    value: 0,
    deliverables: {},      // Objeto { deliverableTypeId: quantidade }
    assignedPeople: [],    // Array de IDs de pessoas
    squadTag: '',          // ID do squad (opcional)
    period: ''             // Período (ex: "2025-03")
};

/**
 * Modelo de Squad
 */
export const SquadModel = {
    id: '',
    name: '',
    headId: '',           // ID da pessoa que é head
    members: [],          // Array de IDs de pessoas
    contracts: []         // Array de IDs de contratos
};

/**
 * Lista de Funções Padrão
 */
export const DEFAULT_ROLES = [
    'Designer',
    'Copywriter',
    'Editor de Vídeo',
    'Filmmaker',
    'Gestor de Tráfego',
    'Head Executivo',
    'Head Criativo',
    'Fotógrafo',
    'Motion Designer',
    'Estrategista',
    'Social Media'
];

/**
 * Tipos de Entregáveis Padrão
 */
export const DEFAULT_DELIVERABLE_TYPES = [
    {
        id: 'criativo_estatico',
        name: 'Criativo Estático',
        roles: ['Designer', 'Copywriter'],
        defaultWeight: 1,
        description: 'Posts estáticos para redes sociais'
    },
    {
        id: 'video_editado',
        name: 'Vídeo Editado',
        roles: ['Editor de Vídeo', 'Filmmaker'],
        defaultWeight: 5,
        description: 'Vídeo completo editado e finalizado'
    },
    {
        id: 'clipe',
        name: 'Clipe (Corte)',
        roles: ['Editor de Vídeo'],
        defaultWeight: 1,
        description: 'Corte curto de vídeo existente'
    },
    {
        id: 'roteiro',
        name: 'Roteiro',
        roles: ['Copywriter'],
        defaultWeight: 2,
        description: 'Roteiro para vídeo ou conteúdo'
    },
    {
        id: 'gestao_trafego',
        name: 'Gestão de Tráfego',
        roles: ['Gestor de Tráfego'],
        defaultWeight: 3,
        description: 'Gerenciamento de campanhas pagas'
    },
    {
        id: 'filmagem',
        name: 'Filmagem',
        roles: ['Filmmaker', 'Fotógrafo'],
        defaultWeight: 4,
        description: 'Captação de vídeo em campo'
    },
    {
        id: 'motion_graphics',
        name: 'Motion Graphics',
        roles: ['Motion Designer'],
        defaultWeight: 4,
        description: 'Animações e efeitos visuais'
    },
    {
        id: 'carrossel',
        name: 'Carrossel',
        roles: ['Designer', 'Copywriter'],
        defaultWeight: 2,
        description: 'Post carrossel para Instagram/LinkedIn'
    },
    {
        id: 'stories',
        name: 'Stories',
        roles: ['Designer'],
        defaultWeight: 0.5,
        description: 'Stories para redes sociais'
    },
    {
        id: 'reels',
        name: 'Reels/TikTok',
        roles: ['Editor de Vídeo', 'Social Media'],
        defaultWeight: 2,
        description: 'Vídeo vertical para redes sociais'
    }
];

/**
 * Validação de Modelo
 */
export function validatePerson(person) {
    if (!person.name || !person.role || person.salary === undefined) {
        throw new Error('Pessoa deve ter nome, função e salário');
    }
    if (person.salary < 0) {
        throw new Error('Salário não pode ser negativo');
    }
    return true;
}

export function validateContract(contract) {
    if (!contract.clientName || contract.value === undefined) {
        throw new Error('Contrato deve ter nome do cliente e valor');
    }
    if (contract.value < 0) {
        throw new Error('Valor do contrato não pode ser negativo');
    }
    return true;
}

export function validateRole(role) {
    if (!role.name) {
        throw new Error('Função deve ter um nome');
    }
    return true;
}

export function validateDeliverableType(deliverableType) {
    if (!deliverableType.name || !deliverableType.roles || deliverableType.roles.length === 0) {
        throw new Error('Tipo de entregável deve ter nome e pelo menos uma função associada');
    }
    if (deliverableType.defaultWeight === undefined || deliverableType.defaultWeight <= 0) {
        throw new Error('Peso padrão deve ser maior que zero');
    }
    return true;
}
