// seedData.js - Dados de exemplo para demonstração

export const seedData = {
    people: [
        // Creative Squad
        {
            id: 'p1',
            name: 'Thauany',
            role: 'Designer Sênior',
            salary: 4500,
            createdAt: '2024-01-15T10:00:00Z'
        },
        {
            id: 'p2',
            name: 'Bianca',
            role: 'Designer',
            salary: 3800,
            createdAt: '2024-02-01T10:00:00Z'
        },
        {
            id: 'p3',
            name: 'Yuri',
            role: 'Copywriter',
            salary: 3500,
            createdAt: '2024-01-20T10:00:00Z'
        },
        {
            id: 'p4',
            name: 'Luan',
            role: 'Editor de Vídeo',
            salary: 4000,
            createdAt: '2024-02-10T10:00:00Z'
        },
        // Operations Squad
        {
            id: 'p5',
            name: 'Deise',
            role: 'Head Executiva',
            salary: 5500,
            createdAt: '2024-01-10T10:00:00Z'
        },
        {
            id: 'p6',
            name: 'Amanda Canello',
            role: 'Gestora de Tráfego',
            salary: 4200,
            createdAt: '2024-02-15T10:00:00Z'
        },
        {
            id: 'p7',
            name: 'Mateus',
            role: 'Analista de Dados',
            salary: 3900,
            createdAt: '2024-03-01T10:00:00Z'
        },
        {
            id: 'p8',
            name: 'Wendel',
            role: 'Desenvolvedor',
            salary: 4800,
            createdAt: '2024-01-25T10:00:00Z'
        }
    ],
    
    squads: [
        {
            id: 's1',
            name: 'Squad Criativo',
            description: 'Responsável por criação de conteúdo visual e escrito',
            members: ['p1', 'p2', 'p3', 'p4'],
            createdAt: '2024-01-15T10:00:00Z'
        },
        {
            id: 's2',
            name: 'Squad Operacional',
            description: 'Gestão de tráfego, análise e desenvolvimento',
            members: ['p5', 'p6', 'p7', 'p8'],
            createdAt: '2024-01-15T10:00:00Z'
        }
    ],
    
    contracts: [
        {
            id: 'c1',
            client: 'Empresa Tech Solutions',
            value: 12000,
            deliverables: {
                'Criativos': 30,
                'Vídeos': 8,
                'Gestão de Tráfego': 1
            },
            squadId: 's1',
            assignedPeople: [],
            notes: 'Cliente de tecnologia focado em B2B',
            createdAt: '2024-01-20T10:00:00Z'
        },
        {
            id: 'c2',
            client: 'Restaurante Bella Vista',
            value: 5500,
            deliverables: {
                'Criativos': 20,
                'Vídeos': 4,
                'Gestão de Tráfego': 1
            },
            squadId: null,
            assignedPeople: ['p1', 'p4', 'p6'],
            notes: 'Restaurante local, foco em Instagram',
            createdAt: '2024-02-01T10:00:00Z'
        },
        {
            id: 'c3',
            client: 'E-commerce Moda Urbana',
            value: 18000,
            deliverables: {
                'Criativos': 50,
                'Vídeos': 12,
                'Gestão de Tráfego': 1,
                'Landing Pages': 3
            },
            squadId: 's2',
            assignedPeople: [],
            notes: 'E-commerce de moda com alto volume de vendas',
            createdAt: '2024-02-10T10:00:00Z'
        },
        {
            id: 'c4',
            client: 'Academia Fitness Pro',
            value: 7200,
            deliverables: {
                'Criativos': 25,
                'Vídeos': 6,
                'Gestão de Tráfego': 1
            },
            squadId: null,
            assignedPeople: ['p2', 'p3', 'p6'],
            notes: 'Academia com 3 unidades, campanhas sazonais',
            createdAt: '2024-03-01T10:00:00Z'
        },
        {
            id: 'c5',
            client: 'Imobiliária Prime',
            value: 9500,
            deliverables: {
                'Criativos': 35,
                'Vídeos': 10,
                'Gestão de Tráfego': 1,
                'Tours Virtuais': 5
            },
            squadId: 's1',
            assignedPeople: [],
            notes: 'Imobiliária de alto padrão',
            createdAt: '2024-03-15T10:00:00Z'
        },
        {
            id: 'c6',
            client: 'Clínica Odontológica Sorrir',
            value: 4800,
            deliverables: {
                'Criativos': 15,
                'Vídeos': 3,
                'Gestão de Tráfego': 1
            },
            squadId: null,
            assignedPeople: ['p1', 'p6'],
            notes: 'Clínica odontológica familiar',
            createdAt: '2024-03-20T10:00:00Z'
        }
    ]
};

// Function to load seed data
export function loadSeedData() {
    // Check if data already exists
    if (localStorage.getItem('agency_contracts')) {
        const confirm = window.confirm(
            'Já existem dados salvos. Deseja substituir com os dados de exemplo?\n\n' +
            'ATENÇÃO: Isso apagará todos os dados atuais!'
        );
        if (!confirm) return false;
    }

    // Save seed data
    localStorage.setItem('agency_people', JSON.stringify(seedData.people));
    localStorage.setItem('agency_squads', JSON.stringify(seedData.squads));
    localStorage.setItem('agency_contracts', JSON.stringify(seedData.contracts));

    return true;
}

// Function to clear all data
export function clearAllData() {
    const confirm = window.confirm(
        'Tem certeza que deseja apagar TODOS os dados?\n\n' +
        'Esta ação não pode ser desfeita!'
    );
    
    if (confirm) {
        localStorage.removeItem('agency_people');
        localStorage.removeItem('agency_squads');
        localStorage.removeItem('agency_contracts');
        
        // Reinitialize with empty arrays
        localStorage.setItem('agency_people', JSON.stringify([]));
        localStorage.setItem('agency_squads', JSON.stringify([]));
        localStorage.setItem('agency_contracts', JSON.stringify([]));
        
        return true;
    }
    
    return false;
}

// Make functions globally available
window.loadSeedData = loadSeedData;
window.clearAllData = clearAllData;
