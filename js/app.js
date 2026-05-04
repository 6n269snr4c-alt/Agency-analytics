// app.js - Main application entry point
// IMPORTANTE: todos os imports devem vir antes de qualquer código executável

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
import { renderProjectsPage } from './pages/projectsPage.js';
import { renderClientsPage } from './pages/clientsPage.js';   // ← NOVO
import { migrateToPeriods } from './migrateToPeriods.js';
import migration from './migrations/migrateToMonthlySystem.js';

// Rodar migração se necessário (após imports)
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

// Initialize app
function init() {
    migrateToPeriods();
    renderNavbar();

    router.register('/', renderDashboard);
    router.register('/contracts', renderContractsPage);
    router.register('/projects', renderProjectsPage);
    router.register('/clients', renderClientsPage);            // ← NOVO
    router.register('/people', renderPeoplePage);
    router.register('/squads', renderSquadsPage);
    router.register('/comparison', renderSquadComparisonPage);
    router.register('/deliverables', renderDeliverableTypesPage);
    router.register('/validation', renderValidationPage);
    router.register('/evolution', renderEvolutionPage);
    router.register('/roles', renderRolesPage);

    router.init();
    console.log('🚀 Fast Analytics — Clientes + Projetos Pontuais');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
