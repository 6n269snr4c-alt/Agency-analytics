// migrateToMonthlySystem.js
// Script de migração para sistema mensal
// EXECUTA UMA VEZ para converter dados atuais

import storage from '../store/storage.js';

class MonthlySystemMigration {
    constructor() {
        this.migrationPeriod = '2026-04'; // Abril/2026
        this.defaultDuration = 12; // 12 meses para todos contratos
    }

    // Executa migração completa
    async migrate() {
        console.log('🚀 Iniciando migração para sistema mensal...');
        
        try {
            // 1. Migrar contratos
            const contractsMigrated = this.migrateContracts();
            console.log(`✅ ${contractsMigrated} contratos migrados`);
            
            // 2. Migrar salários
            const salariesMigrated = this.migrateSalaries();
            console.log(`✅ ${salariesMigrated} salários migrados`);
            
            // 3. Definir período atual
            storage.setCurrentPeriod(this.migrationPeriod);
            console.log(`✅ Período atual: ${this.migrationPeriod}`);
            
            // 4. Salvar flag de migração
            localStorage.setItem('migration_monthly_system_done', 'true');
            localStorage.setItem('migration_monthly_system_date', new Date().toISOString());
            
            console.log('🎉 Migração concluída com sucesso!');
            return true;
            
        } catch (error) {
            console.error('❌ Erro na migração:', error);
            return false;
        }
    }

    // Migrar contratos para novo modelo
    migrateContracts() {
        const contracts = storage.getContracts();
        let migrated = 0;
        
        contracts.forEach(contract => {
            // Pular se já tiver projeções
            if (contract.monthlyProjections && contract.monthlyProjections.length > 0) {
                return;
            }
            
            // Converter para novo modelo
            contract.baseValue = contract.value || 0;
            contract.startPeriod = this.migrationPeriod;
            contract.duration = this.defaultDuration;
            contract.status = contract.status || 'active';
            contract.baseDeliverables = contract.deliverables || {};
            
            // Gerar projeções
            const projections = [];
            let [year, month] = this.migrationPeriod.split('-').map(Number);
            
            for (let i = 0; i < this.defaultDuration; i++) {
                const periodId = `${year}-${String(month).padStart(2, '0')}`;
                
                projections.push({
                    periodId,
                    value: contract.baseValue,
                    deliverables: { ...contract.baseDeliverables },
                    status: i === 0 ? 'confirmed' : 'projected',
                    createdAt: new Date().toISOString()
                });
                
                month++;
                if (month > 12) {
                    month = 1;
                    year++;
                }
            }
            
            contract.monthlyProjections = projections;
            migrated++;
        });
        
        storage.saveContracts(contracts);
        return migrated;
    }

    // Migrar salários para histórico
    migrateSalaries() {
        const people = storage.getPeople();
        let migrated = 0;
        
        people.forEach(person => {
            // Criar entrada de salário para o período de migração
            storage.setSalaryForPeriod(
                person.id,
                this.migrationPeriod,
                person.salary || 0,
                'active'
            );
            migrated++;
        });
        
        return migrated;
    }

    // Verificar se migração já foi feita
    static isMigrated() {
        return localStorage.getItem('migration_monthly_system_done') === 'true';
    }

    // Desfazer migração (CUIDADO!)
    rollback() {
        console.warn('⚠️ Desfazendo migração...');
        
        const contracts = storage.getContracts();
        contracts.forEach(contract => {
            // Remover campos do novo sistema
            delete contract.monthlyProjections;
            delete contract.baseValue;
            delete contract.startPeriod;
            delete contract.duration;
            delete contract.baseDeliverables;
        });
        storage.saveContracts(contracts);
        
        // Limpar histórico de salários
        storage.saveSalaryHistory([]);
        
        // Remover flags
        localStorage.removeItem('migration_monthly_system_done');
        localStorage.removeItem('migration_monthly_system_date');
        
        console.log('✅ Rollback concluído');
    }
}

export default new MonthlySystemMigration();
