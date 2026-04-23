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
import { renderRolesPage } from './pages/rolesPage.js'; // ← ADICIONADO
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
    router.register('/roles', renderRolesPage); // ← ADICIONADO

    // Initialize router
    router.init();

    console.log('🚀 Agency Analytics initialized with Roles');
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
