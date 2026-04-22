// migrateToPeriods.js - Migration script to convert existing data to period-based model

import storage from './store/storage.js';
import periodService from './services/periodService.js';

export function migrateToPeriods() {
    console.log('🔄 Starting migration to period-based model...');
    
    // Check if already migrated
    const contractsPerPeriod = storage.getContractsPerPeriod();
    if (contractsPerPeriod.length > 0) {
        console.log('✅ Already migrated!');
        return { success: true, alreadyMigrated: true };
    }
    
    try {
        // Get current month/year
        const currentMonthYear = periodService.getCurrentMonthYear();
        const currentPeriodId = currentMonthYear.periodId;
        
        console.log(`📅 Current period: ${currentPeriodId}`);
        
        // Set current period
        storage.setCurrentPeriod(currentPeriodId);
        
        // Migrate contracts to current period
        const existingContracts = storage.getContracts();
        console.log(`📋 Migrating ${existingContracts.length} contracts...`);
        storage.saveContractsForPeriod(currentPeriodId, existingContracts);
        
        // Migrate payroll to current period
        const existingPeople = storage.getPeople();
        console.log(`👥 Migrating ${existingPeople.length} people to payroll...`);
        
        const payroll = existingPeople.map(person => ({
            personId: person.id,
            salary: person.salary,
            name: person.name,
            role: person.role
        }));
        
        storage.savePayrollForPeriod(currentPeriodId, payroll);
        
        console.log('✅ Migration completed successfully!');
        
        return {
            success: true,
            periodId: currentPeriodId,
            contractsMigrated: existingContracts.length,
            peopleMigrated: existingPeople.length
        };
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Auto-run migration on first load
if (typeof window !== 'undefined') {
    const migrationResult = migrateToPeriods();
    
    if (migrationResult.success && !migrationResult.alreadyMigrated) {
        console.log('🎉 Migration completed!', migrationResult);
    }
}
