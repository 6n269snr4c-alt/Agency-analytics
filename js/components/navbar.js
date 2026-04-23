// navbar.js - Menu Lateral Esquerdo Profissional

export function renderNavbar() {
    const navbarContainer = document.getElementById('navbar');
    
    navbarContainer.innerHTML = `
        <!-- Sidebar -->
        <nav class="sidebar">
            <!-- Logo/Header -->
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <span class="logo-icon">⚡</span>
                    <span class="logo-text">Agency Analytics</span>
                </div>
            </div>

            <!-- Navigation Links -->
            <div class="sidebar-nav">
                <a href="#/" class="nav-link" data-route="/">
                    <span class="nav-icon">📊</span>
                    <span class="nav-text">Dashboard</span>
                </a>
                
                <a href="#/evolution" class="nav-link" data-route="/evolution">
                    <span class="nav-icon">📈</span>
                    <span class="nav-text">Evolução</span>
                </a>
                
                <div class="nav-divider"></div>
                
                <a href="#/contracts" class="nav-link" data-route="/contracts">
                    <span class="nav-icon">📋</span>
                    <span class="nav-text">Contratos</span>
                </a>
                
                <a href="#/people" class="nav-link" data-route="/people">
                    <span class="nav-icon">👥</span>
                    <span class="nav-text">Pessoas</span>
                </a>
                
                <a href="#/squads" class="nav-link" data-route="/squads">
                    <span class="nav-icon">🎯</span>
                    <span class="nav-text">Squads</span>
                </a>
                
                <div class="nav-divider"></div>
                
                <a href="#/deliverables" class="nav-link" data-route="/deliverables">
                    <span class="nav-icon">📦</span>
                    <span class="nav-text">Entregáveis</span>
                </a>
                
                <a href="#/roles" class="nav-link" data-route="/roles">
                    <span class="nav-icon">⚖️</span>
                    <span class="nav-text">Funções</span>
                </a>
                
                <div class="nav-divider"></div>
                
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
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">v2.0</div>
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
            window.router.navigate(route);
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
        }
    });
}

// Exportar função para atualizar active ao navegar
window.updateActiveLink = updateActiveLink;
