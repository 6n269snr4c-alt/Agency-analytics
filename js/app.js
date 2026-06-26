// app.js - v3
// Sistema de pesos/entregáveis genéricos foi removido.
// Rotas /roles e /deliverables (Gestão de Funções / Entregáveis) foram descontinuadas.

import { renderNavbar } from './components/navbar.js';
import router from './router.js';
import storage from './store/storage.js';
import { renderDashboard } from './pages/dashboardPage.js';
import { renderContractsPage } from './pages/contractsPage.js';
import { renderPeoplePage } from './pages/peoplePage.js';
import { renderSquadsPage } from './pages/squadsPage.js';
import { renderSquadComparisonPage } from './pages/squadComparisonPage.js';
import { renderValidationPage } from './pages/validationPage.js';
import { renderEvolutionPage } from './pages/evolutionPage.js';
import { renderProjectsPage } from './pages/projectsPage.js';
import { renderClientsPage } from './pages/clientsPage.js';

async function init() {
    const contentEl = document.getElementById('content');
    if (contentEl) contentEl.innerHTML = '<div style="padding:3rem;text-align:center;color:#888;">☁️ Sincronizando dados…</div>';

    await storage.loadFromFirestore();

    renderNavbar();

    router.register('/', renderDashboard);
    router.register('/contracts', renderContractsPage);
    router.register('/projects', renderProjectsPage);
    router.register('/clients', renderClientsPage);
    router.register('/people', renderPeoplePage);
    router.register('/squads', renderSquadsPage);
    router.register('/comparison', renderSquadComparisonPage);
    router.register('/validation', renderValidationPage);
    router.register('/evolution', renderEvolutionPage);

    router.init();
    console.log('🚀 Fast Analytics v3 — rateio simplificado (vídeo/estático + fixo)');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
