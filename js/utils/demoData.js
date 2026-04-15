// demoData.js - Sample data for testing

export const demoData = {
    people: [
        // Designers
        { name: "Ana Silva", role: "Designer", salary: 4500 },
        { name: "Bruno Costa", role: "Designer", salary: 5200 },
        { name: "Carla Santos", role: "Designer", salary: 3800 },
        
        // Copywriters
        { name: "Daniel Oliveira", role: "Copywriter", salary: 4000 },
        { name: "Eduarda Lima", role: "Copywriter", salary: 4500 },
        
        // Heads
        { name: "Felipe Martins", role: "Head Executivo", salary: 8000 },
        { name: "Gabriela Rocha", role: "Head Criativo", salary: 7500 },
        
        // Gestores de Tráfego
        { name: "Hugo Alves", role: "Gestor de Tráfego", salary: 5500 },
        { name: "Isabela Ferreira", role: "Gestor de Tráfego", salary: 6000 },
        
        // Editores
        { name: "João Pedro", role: "Editor de Vídeo", salary: 4200 },
        { name: "Larissa Souza", role: "Editor de Vídeo", salary: 3900 }
    ],
    
    squads: [
        {
            name: "Squad Alpha",
            description: "Time principal para grandes contas",
            members: [] // Will be populated with IDs
        },
        {
            name: "Squad Beta",
            description: "Time de crescimento",
            members: []
        },
        {
            name: "Squad Performance",
            description: "Especialistas em mídia paga",
            members: []
        }
    ],
    
    contracts: [
        {
            client: "TechCorp Brasil",
            value: 15000,
            deliverables: {
                "Criativos": 20,
                "Vídeos": 4,
                "Posts": 30
            },
            notes: "Cliente premium - prioridade alta"
        },
        {
            client: "Loja Virtual Plus",
            value: 8500,
            deliverables: {
                "Criativos": 15,
                "Vídeos": 2,
                "Stories": 20
            },
            notes: "E-commerce - foco em conversão"
        },
        {
            client: "Restaurante Gourmet",
            value: 3500,
            deliverables: {
                "Criativos": 10,
                "Vídeos": 1,
                "Posts": 12
            },
            notes: "Cliente local - relacionamento"
        },
        {
            client: "Academia FitLife",
            value: 5000,
            deliverables: {
                "Criativos": 12,
                "Vídeos": 3,
                "Reels": 15
            },
            notes: "Conteúdo fitness e motivacional"
        },
        {
            client: "StartUp inovaTech",
            value: 12000,
            deliverables: {
                "Criativos": 18,
                "Vídeos": 5,
                "Landing Pages": 2
            },
            notes: "Cliente em fase de crescimento"
        },
        {
            client: "Clínica Dr. Saúde",
            value: 6000,
            deliverables: {
                "Criativos": 14,
                "Vídeos": 2,
                "Posts Educativos": 20
            },
            notes: "Conteúdo educativo e institucional"
        },
        {
            client: "Moda & Estilo",
            value: 9000,
            deliverables: {
                "Criativos": 25,
                "Vídeos": 3,
                "Stories": 30,
                "Reels": 10
            },
            notes: "Alta demanda visual"
        },
        {
            client: "Construtora Premier",
            value: 7500,
            deliverables: {
                "Criativos": 10,
                "Vídeos": 2,
                "Tours Virtuais": 3
            },
            notes: "Conteúdo institucional"
        }
    ]
};

export function loadDemoData(storage) {
    // Clear existing data
    storage.clearAll();
    
    // Add people
    const peopleIds = [];
    demoData.people.forEach(personData => {
        const person = storage.addPerson(personData);
        peopleIds.push(person.id);
    });
    
    // Create squads with members
    const squadIds = [];
    
    // Squad Alpha - Premium team
    const squadAlpha = storage.addSquad({
        name: "Squad Alpha",
        description: "Time principal para grandes contas",
        members: [
            peopleIds[0], // Ana Silva - Designer
            peopleIds[3], // Daniel Oliveira - Copywriter
            peopleIds[5], // Felipe Martins - Head Executivo
            peopleIds[7], // Hugo Alves - Gestor de Tráfego
            peopleIds[9]  // João Pedro - Editor
        ]
    });
    squadIds.push(squadAlpha.id);
    
    // Squad Beta - Growth team
    const squadBeta = storage.addSquad({
        name: "Squad Beta",
        description: "Time de crescimento",
        members: [
            peopleIds[1], // Bruno Costa - Designer
            peopleIds[4], // Eduarda Lima - Copywriter
            peopleIds[6], // Gabriela Rocha - Head Criativo
            peopleIds[10] // Larissa Souza - Editor
        ]
    });
    squadIds.push(squadBeta.id);
    
    // Squad Performance
    const squadPerformance = storage.addSquad({
        name: "Squad Performance",
        description: "Especialistas em mídia paga",
        members: [
            peopleIds[2], // Carla Santos - Designer
            peopleIds[8]  // Isabela Ferreira - Gestor de Tráfego
        ]
    });
    squadIds.push(squadPerformance.id);
    
    // Add contracts with assignments
    demoData.contracts.forEach((contractData, index) => {
        const contract = { ...contractData };
        
        // Assign squads strategically
        if (index < 3) {
            // First 3 contracts to Squad Alpha
            contract.squadId = squadIds[0];
        } else if (index < 6) {
            // Next 3 to Squad Beta
            contract.squadId = squadIds[1];
        } else {
            // Remaining to individual people or Squad Performance
            if (index === 6) {
                contract.squadId = squadIds[2];
            } else {
                // Assign to individual people
                contract.assignedPeople = [peopleIds[0], peopleIds[3]];
            }
        }
        
        storage.addContract(contract);
    });
    
    return {
        peopleCount: peopleIds.length,
        squadsCount: squadIds.length,
        contractsCount: demoData.contracts.length
    };
}
