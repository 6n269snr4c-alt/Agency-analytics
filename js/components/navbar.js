// navbar.js - Navigation component

import router from '../router.js';

export function renderNavbar() {
    const navbarEl = document.getElementById('navbar');
    
    navbarEl.innerHTML = `
        <div class="nav-container">
            <a href="#/" class="nav-brand">⚡ Agency Analytics</a>
            <ul class="nav-links">
                <li><a href="#/" data-route="/">Dashboard</a></li>
                <li><a href="#/deliverables" data-route="/deliverables">Entregáveis</a></li>
                <li><a href="#/contracts" data-route="/contracts">Contratos</a></li>
                <li><a href="#/people" data-route="/people">Pessoas</a></li>
                <li><a href="#/squads" data-route="/squads">Squads</a></li>
                <li><a href="#/comparison" data-route="/comparison">Comparação</a></li>
                <li><a href="#/validation" data-route="/validation">Validação</a></li>
            </ul>
        </div>
    `;

    // Add click handlers for navigation links
    const links = navbarEl.querySelectorAll('a[data-route]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const route = link.getAttribute('data-route');
            router.navigate(route);
        });
    });
}
