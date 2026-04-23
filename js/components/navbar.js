// navbar.js - Fast Analytics Sidebar

export function renderNavbar() {
    const navbarContainer = document.getElementById('navbar');
    
    navbarContainer.innerHTML = `
        <nav class="sidebar">
            <!-- Header com Logo -->
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <img src="LOGOFASTWHITE.png" alt="Fast Digital 360" class="logo-image">
                    <div class="logo-subtitle">Analytics</div>
                </div>
            </div>

            <!-- Navigation -->
            <div class="sidebar-nav">
                <!-- Overview -->
                <div class="nav-section-title">Overview</div>
                
                <a href="#/" class="nav-link" data-route="/">
                    <span class="nav-icon">📊</span>
                    <span class="nav-text">Dashboard</span>
                </a>
                
                <a href="#/evolution" class="nav-link" data-route="/evolution">
                    <span class="nav-icon">📈</span>
                    <span class="nav-text">Evolução</span>
                </a>
                
                <div class="nav-divider"></div>
                
                <!-- Gestão -->
                <div class="nav-section-title">Gestão</div>
                
                <a href="#/contracts" class="nav-link" data-route="/contracts">
                    <span class="nav-icon">📋</span>
                    <span class="nav-text">Contratos</span>
                </a>
                
                <a href="#/people" class="nav-link" data-route="/people">
                    <span class="nav-icon">👥</span>
                    <span class="nav-text">Pessoas</span>
                </a>
                
                <a href="#/squads" class="nav-link" data-route="/squads">
                    <span class="nav-icon">⚡</span>
                    <span class="nav-text">Squads</span>
                </a>
                
                <div class="nav-divider"></div>
                
                <!-- Configuração -->
                <div class="nav-section-title">Config</div>
                
                <a href="#/deliverables" class="nav-link" data-route="/deliverables">
                    <span class="nav-icon">📦</span>
                    <span class="nav-text">Entregáveis</span>
                </a>
                
                <a href="#/roles" class="nav-link" data-route="/roles">
                    <span class="nav-icon">⚖️</span>
                    <span class="nav-text">Funções</span>
                </a>
                
                <div class="nav-divider"></div>
                
                <!-- Análise -->
                <div class="nav-section-title">Análise</div>
                
                <a href="#/comparison" class="nav-link" data-route="/comparison">
                    <span class="nav-icon">📊</span>
                    <span class="nav-text">Comparação</span>
                </a>
                
                <a href="#/validation" class="nav-link" data-route="/validation">
                    <span class="nav-icon">✓</span>
                    <span class="nav-text">Validação</span>
                </a>
            </div>

            <!-- Footer -->
            <div class="sidebar-footer">
                <div class="sidebar-footer-info">
                    <div>v2.0 • <strong>Fast Analytics</strong></div>
                    <div style="margin-top: 0.25rem;">💚 Made with Fast Digital 360</div>
                </div>
            </div>
        </nav>
    `;

    attachNavHandlers();
}

function attachNavHandlers() {
    const links = document.querySelectorAll('.nav-link');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active de todos
            links.forEach(l => l.classList.remove('active'));
            
            // Adiciona active no clicado
            link.classList.add('active');
            
            // Navega
            const route = link.getAttribute('data-route');
            if (window.router) {
                window.router.navigate(route);
            }
        });
    });
    
    // Set active baseado na rota atual
    updateActiveLink();
}

function updateActiveLink() {
    const currentRoute = window.location.hash.slice(1) || '/';
    const links = document.querySelectorAll('.nav-link');
    
    links.forEach(link => {
        const route = link.getAttribute('data-route');
        if (route === currentRoute) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Exportar para ser chamado quando navegar
window.updateActiveLink = updateActiveLink;
