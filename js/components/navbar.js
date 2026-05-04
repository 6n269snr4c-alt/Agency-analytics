// navbar.js - Fast Analytics (SIMPLIFICADO E FUNCIONAL)

export function renderNavbar() {
    const navbarContainer = document.getElementById('navbar');
    
    navbarContainer.innerHTML = `
        <nav class="sidebar">
            <!-- Header -->
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <img src="./LOGOFASTWHITE.png" alt="Fast" class="logo-image" onerror="this.style.display='none'">
                    <div class="logo-subtitle">ANALYTICS</div>
                </div>
            </div>

            <!-- Navigation -->
            <div class="sidebar-nav">
                <a href="#/" class="nav-link" data-route="/">
                    <span class="nav-icon">📊</span>
                    <span class="nav-text">Dashboard</span>
                </a>
                
                <a href="#/evolution" class="nav-link" data-route="/evolution">
                    <span class="nav-icon">📈</span>
                    <span class="nav-text">Evolução</span>
                </a>
                
                <a href="#/contracts" class="nav-link" data-route="/contracts">
                    <span class="nav-icon">📋</span>
                    <span class="nav-text">Contratos</span>
                </a>

                <a href="#/projects" class="nav-link" data-route="/projects">
                    <span class="nav-icon">🚀</span>
                    <span class="nav-text">Proj. Pontuais</span>
                </a>
                
                <a href="#/people" class="nav-link" data-route="/people">
                    <span class="nav-icon">👥</span>
                    <span class="nav-text">Pessoas</span>
                </a>
                
                <a href="#/squads" class="nav-link" data-route="/squads">
                    <span class="nav-icon">⚡</span>
                    <span class="nav-text">Squads</span>
                </a>
                
                <a href="#/deliverables" class="nav-link" data-route="/deliverables">
                    <span class="nav-icon">📦</span>
                    <span class="nav-text">Entregáveis</span>
                </a>
                
                <a href="#/roles" class="nav-link" data-route="/roles">
                    <span class="nav-icon">⚖️</span>
                    <span class="nav-text">Funções</span>
                </a>
                
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
                <div class="sidebar-footer-text">
                    Fast Digital 360
                </div>
            </div>
        </nav>
    `;

    // Attach handlers
    setTimeout(() => {
        attachNavHandlers();
    }, 100);
}

function attachNavHandlers() {
    const links = document.querySelectorAll('.nav-link');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active de todos
            links.forEach(l => l.classList.remove('active'));
            
            // Adiciona active no clicado
            this.classList.add('active');
            
            // Navega
            const route = this.getAttribute('data-route');
            
            // Usar router global
            if (window.router && window.router.navigate) {
                window.router.navigate(route);
            } else {
                // Fallback: mudar hash manualmente
                window.location.hash = route;
            }
        });
    });
    
    // Set active inicial
    updateActiveLink();
}

function updateActiveLink() {
    const currentRoute = window.location.hash.slice(1) || '/';
    const links = document.querySelectorAll('.nav-link');
    
    links.forEach(link => {
        const route = link.getAttribute('data-route');
        link.classList.remove('active');
        if (route === currentRoute) {
            link.classList.add('active');
        }
    });
}

// Escutar mudanças de hash
window.addEventListener('hashchange', updateActiveLink);

// Exportar
window.updateActiveLink = updateActiveLink;
