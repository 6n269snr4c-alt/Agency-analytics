// app.js - Main application entry point

import { renderNavbar } from './components/navbar.js';
import router from './router.js';
import { renderDashboard } from './pages/dashboardPage.js';
import { renderContractsPage } from './pages/contractsPage.js';
import { renderPeoplePage } from './pages/peoplePage.js';
import { renderSquadsPage } from './pages/squadsPage.js';
import { renderComparisonPage } from './pages/comparisonPage.js';

// Initialize app
function init() {
    // Render navbar
    renderNavbar();

    // Register routes
    router.register('/', renderDashboard);
    router.register('/contracts', renderContractsPage);
    router.register('/people', renderPeoplePage);
    router.register('/squads', renderSquadsPage);
    router.register('/comparison', renderComparisonPage);

    // Initialize router
    router.init();

    console.log('🚀 Agency Analytics initialized');
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
