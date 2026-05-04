import migration from './migrations/migrateToMonthlySystem.js';

// Rodar migração se necessário
if (!migration.constructor.isMigrated()) {
    console.log('⚠️ Sistema precisa ser migrado!');
    const confirmMigration = confirm(
        'O sistema foi atualizado!\n\n' +
        'Precisa migrar dados para formato mensal.\n\n' +
        '✅ Contratos → 12 meses (Abr/26 a Mar/27)\n' +
        '✅ Salários → Histórico Abr/2026\n\n' +
        'Continuar?'
    );

    if (confirmMigration) {
        migration.migrate();
        alert('✅ Migração OK! Recarregando...');
        location.reload();
    }
}

// app.js - Main application entry point

import { renderNavbar } from './components/navbar.js';
import router from './router.js';
import { renderDashboard } from './pages/dashboardPage.js';
import { renderContractsPage } from './pages/contractsPage.js';
import { renderPeoplePage } from './pages/peoplePage.js';
import { renderSquadsPage } from './pages/squadsPage.js';
import { renderComparisonPage } from './pages/comparisonPage.js';
import { renderSquadComparisonPage } from './pages/squadComparisonPage.js';
import { renderDeliverableTypesPage } from './pages/deliverableTypesPage.js';
import { renderValidationPage } from './pages/validationPage.js';
import { renderEvolutionPage } from './pages/evolutionPage.js';
import { renderRolesPage } from './pages/rolesPage.js';
import { renderProjectsPage } from './pages/projectsPage.js'; // ← NOVO
import { migrateToPeriods } from './migrateToPeriods.js';

// Initialize app
function init() {
    // Run migration to period-based model
    migrateToPeriods();

    // Render navbar
    renderNavbar();

    // Register routes
    router.register('/', renderDashboard);
    router.register('/contracts', renderContractsPage);
    router.register('/people', renderPeoplePage);
    router.register('/squads', renderSquadsPage);
    router.register('/comparison', renderSquadComparisonPage);
    router.register('/deliverables', renderDeliverableTypesPage);
    router.register('/validation', renderValidationPage);
    router.register('/evolution', renderEvolutionPage);
    router.register('/roles', renderRolesPage);
    router.register('/projects', renderProjectsPage); // ← NOVO

    // Initialize router
    router.init();

    console.log('🚀 Agency Analytics initialized with Projetos Pontuais');
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
