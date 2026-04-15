// router.js - Simple SPA router

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
    }

    register(path, handler) {
        this.routes[path] = handler;
    }

    navigate(path) {
        if (this.routes[path]) {
            this.currentRoute = path;
            
            // Update URL without page reload
            window.history.pushState({}, '', `#${path}`);
            
            // Update active nav link
            this.updateActiveNav(path);
            
            // Execute route handler
            this.routes[path]();
        } else {
            console.error(`Route not found: ${path}`);
        }
    }

    updateActiveNav(path) {
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            const href = link.getAttribute('href').replace('#', '');
            if (href === path) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    init() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            const path = window.location.hash.replace('#', '') || '/';
            if (this.routes[path]) {
                this.currentRoute = path;
                this.updateActiveNav(path);
                this.routes[path]();
            }
        });

        // Handle initial route
        const initialPath = window.location.hash.replace('#', '') || '/';
        this.navigate(initialPath);
    }

    getCurrentRoute() {
        return this.currentRoute;
    }
}

export default new Router();
