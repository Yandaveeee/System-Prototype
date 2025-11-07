// Router Module
window.RouterModule = (function() {
    const routes = {
        '/': { requiresAuth: false },
        '/login.html': { requiresAuth: false },
        '/register.html': { requiresAuth: false },
        // UPDATED: Added admin role to student pages and new profile route
        '/student/dashboard.html': { requiresAuth: true, roles: ['student', 'admin'] },
        '/student/announcements.html': { requiresAuth: true, roles: ['student', 'admin'] },
        '/student/events.html': { requiresAuth: true, roles: ['student', 'admin'] },
        '/student/resources.html': { requiresAuth: true, roles: ['student', 'admin'] },
        '/student/lost-found.html': { requiresAuth: true, roles: ['student', 'admin'] },
        '/student/marketplace.html': { requiresAuth: true, roles: ['student', 'admin'] },
        '/student/profile.html': { requiresAuth: true, roles: ['student', 'admin'] }, // NEW ROUTE
        '/admin/dashboard.html': { requiresAuth: true, roles: ['admin'] },
        '/admin/manage-announcements.html': { requiresAuth: true, roles: ['admin'] },
        '/admin/manage-events.html': { requiresAuth: true, roles: ['admin'] },
        '/admin/manage-resources.html': { requiresAuth: true, roles: ['admin'] },
        '/admin/manage-lost-found.html': { requiresAuth: true, roles: ['admin'] },
        '/admin/manage-marketplace.html': { requiresAuth: true, roles: ['admin'] }
    };
    
    function getCurrentPath() {
        return window.location.pathname;
    }
    
    function getRouteConfig(path) {
        // Normalize path
        const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');
        return routes[normalizedPath] || routes[path];
    }
    
    async function checkRouteAccess(user) {
        const currentPath = getCurrentPath();
        const routeConfig = getRouteConfig(currentPath);
        
        if (!routeConfig) {
            return true;
        }
        
        if (!routeConfig.requiresAuth) {
            if (user && (currentPath === '/login.html' || currentPath === '/register.html')) {
                const role = await window.AuthModule.getUserRole(user.uid);
                if (role === 'admin') {
                    window.location.href = '/admin/dashboard.html';
                } else {
                    window.location.href = '/student/dashboard.html';
                }
                return false;
            }
            return true;
        }
        
        if (!user) {
            window.location.href = '/login.html';
            return false;
        }
        
        if (routeConfig.roles) {
            const userRole = await window.AuthModule.getUserRole(user.uid);
            if (!routeConfig.roles.includes(userRole)) {
                if (userRole === 'admin') {
                    window.location.href = '/admin/dashboard.html';
                } else {
                    window.location.href = '/student/dashboard.html';
                }
                return false;
            }
        }
        
        return true;
    }
    
    function navigateTo(path) {
        window.location.href = path;
    }
    
    function goBack() {
        window.history.back();
    }
    
    function reload() {
        window.location.reload();
    }
    
    // Initialize router
    function init() {
        // Handle back/forward buttons
        window.addEventListener('popstate', () => {
            const user = window.AuthModule.getCurrentUser();
            checkRouteAccess(user);
        });
        
        // The conflicting onAuthStateChanged listener has been removed from here.
    }
    
    // Public API
    return {
        getCurrentPath,
        getRouteConfig,
        checkRouteAccess,
        navigateTo,
        goBack,
        reload,
        init
    };
})();