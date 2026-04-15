// test.js - Testes básicos de funcionalidade

import storage from './store/storage.js';
import contractService from './services/contractService.js';
import personService from './services/personService.js';
import squadService from './services/squadService.js';
import analyticsService from './services/analyticsService.js';

console.log('🧪 Iniciando testes...\n');

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`✅ ${description}`);
        testsPassed++;
    } catch (error) {
        console.error(`❌ ${description}`);
        console.error(`   Erro: ${error.message}`);
        testsFailed++;
    }
}

// Limpar dados antes de testar
storage.clearAll();

console.log('--- Testes de Storage ---\n');

test('Storage inicializa arrays vazios', () => {
    const people = storage.getPeople();
    const contracts = storage.getContracts();
    const squads = storage.getSquads();
    
    if (people.length !== 0 || contracts.length !== 0 || squads.length !== 0) {
        throw new Error('Arrays não estão vazios após init');
    }
});

test('Storage adiciona pessoa', () => {
    const person = storage.addPerson({
        name: 'Teste',
        role: 'Designer',
        salary: 3000
    });
    
    if (!person.id || !person.createdAt) {
        throw new Error('Pessoa não tem ID ou createdAt');
    }
});

test('Storage recupera pessoa adicionada', () => {
    const people = storage.getPeople();
    if (people.length !== 1 || people[0].name !== 'Teste') {
        throw new Error('Pessoa não foi recuperada corretamente');
    }
});

console.log('\n--- Testes de Person Service ---\n');

test('PersonService cria pessoa', () => {
    const person = personService.createPerson({
        name: 'João',
        role: 'Copy',
        salary: 3500
    });
    
    if (!person || !person.id) {
        throw new Error('Pessoa não foi criada');
    }
});

test('PersonService valida campos obrigatórios', () => {
    try {
        personService.createPerson({ name: 'Sem Salário' });
        throw new Error('Deveria ter lançado erro');
    } catch (error) {
        if (!error.message.includes('obrigatórios')) {
            throw new Error('Erro de validação incorreto');
        }
    }
});

test('PersonService lista todos', () => {
    const people = personService.getAllPeople();
    if (people.length !== 2) {
        throw new Error(`Esperado 2 pessoas, encontrado ${people.length}`);
    }
});

console.log('\n--- Testes de Squad Service ---\n');

const person1 = storage.getPeople()[0];
const person2 = storage.getPeople()[1];

test('SquadService cria squad', () => {
    const squad = squadService.createSquad({
        name: 'Squad Teste',
        members: [person1.id, person2.id]
    });
    
    if (!squad || squad.members.length !== 2) {
        throw new Error('Squad não foi criado corretamente');
    }
});

test('SquadService calcula custo', () => {
    const squads = squadService.getAllSquads();
    const cost = squadService.getSquadCost(squads[0].id);
    
    if (cost !== 6500) { // 3000 + 3500
        throw new Error(`Custo incorreto: ${cost}`);
    }
});

console.log('\n--- Testes de Contract Service ---\n');

test('ContractService cria contrato', () => {
    const contract = contractService.createContract({
        client: 'Cliente Teste',
        value: 10000,
        deliverables: {
            'Criativos': 20,
            'Vídeos': 5
        }
    });
    
    if (!contract || !contract.id) {
        throw new Error('Contrato não foi criado');
    }
});

test('ContractService valida campos', () => {
    try {
        contractService.createContract({ client: 'Sem Valor' });
        throw new Error('Deveria ter lançado erro');
    } catch (error) {
        if (!error.message.includes('obrigatórios')) {
            throw new Error('Erro de validação incorreto');
        }
    }
});

console.log('\n--- Testes de Analytics Service ---\n');

test('AnalyticsService calcula ROI geral', () => {
    const roi = analyticsService.getOverallROI();
    
    if (roi.revenue !== 10000) {
        throw new Error(`Receita incorreta: ${roi.revenue}`);
    }
    
    if (roi.cost !== 6500) {
        throw new Error(`Custo incorreto: ${roi.cost}`);
    }
    
    if (roi.profit !== 3500) {
        throw new Error(`Lucro incorreto: ${roi.profit}`);
    }
});

test('AnalyticsService calcula produtividade', () => {
    const contracts = contractService.getAllContracts();
    contractService.updateContract(contracts[0].id, {
        assignedPeople: [person1.id]
    });
    
    const costPerDeliverable = analyticsService.getPersonCostPerDeliverable(person1.id);
    
    // 3000 / 25 entregas = 120
    if (Math.abs(costPerDeliverable - 120) > 0.01) {
        throw new Error(`Custo por entrega incorreto: ${costPerDeliverable}`);
    }
});

test('AnalyticsService ranking funciona', () => {
    const ranking = analyticsService.getProductivityRanking();
    
    if (ranking.length !== 2) {
        throw new Error('Ranking deveria ter 2 pessoas');
    }
});

// Limpar dados após testes
storage.clearAll();

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Resultados: ${testsPassed} ✅ | ${testsFailed} ❌\n`);

if (testsFailed === 0) {
    console.log('🎉 Todos os testes passaram!\n');
} else {
    console.log('⚠️  Alguns testes falharam. Revise o código.\n');
}
