// Main Application
(function() {
    'use strict';
    
    // Initialize application
    function initApp() {
        console.log('Initializing CampusCore application...');
        
        // Initialize router
        if (window.RouterModule) {
            window.RouterModule.init();
        }
        
        // --- UPDATED AUTH STATE LISTENER ---
        // Setup global auth state listener
        if (window.AuthModule) {
            window.AuthModule.onAuthStateChanged(async (user) => {
                try {
                    if (!user) {
                        // No user, redirect to login if not already there
                        if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('signup.html')) {
                            // Adjust this path if your login page is elsewhere
                            window.location.href = '../login.html'; 
                        }
                        return; // Stop execution
                    }

                    // We have a user, load their full profile
                    
                    // 1. Fetch role (if AuthModule supports it)
                    let role = 'student'; // Default
                    if (window.AuthModule.getUserRole) {
                         role = await window.AuthModule.getUserRole(user.uid);
                    }
                    
                    // 2. Redirect if on wrong page
                    if (role === 'admin' && !window.location.pathname.includes('/admin/')) {
                        window.location.href = '../admin/dashboard.html'; // Adjust path
                        return;
                    }
                    if (role === 'student' && window.location.pathname.includes('/admin/')) {
                        window.location.href = '../student/dashboard.html'; // Adjust path
                        return;
                    }

                    // 3. Fetch profile data from Firestore
                    if (!window.DatabaseModule || typeof window.DatabaseModule.getUserProfile !== 'function') {
                        console.error("DatabaseModule.getUserProfile is not loaded! Cannot display profile.");
                        throw new Error("DatabaseModule not found.");
                    }
                    const profileData = await window.DatabaseModule.getUserProfile(user.uid);

                    // 4. Determine the correct image source (Firestore Base64 first)
                    const imageSource = profileData?.profilePictureBase64 || user.photoURL;

                    // 5. Populate the shared header
                    // **IMPORTANT**: This assumes you moved setupProfileDropdown to UIModule
                    if (window.UIModule && typeof window.UIModule.setupProfileDropdown === 'function') {
                        window.UIModule.setupProfileDropdown(user, profileData, imageSource);
                    } else {
                        console.warn("UIModule.setupProfileDropdown not found. Using simple display.");
                        // Fallback to old method if function isn't moved
                        if(window.UIModule) window.UIModule.updateUserDisplay(user); 
                    }
                    
                    // 6. Initialize notifications
                    // **IMPORTANT**: This assumes you moved initNotifications to UIModule
                    if (window.UIModule && typeof window.UIModule.initNotifications === 'function') {
                        window.UIModule.initNotifications(user);
                    } else {
                        console.warn("UIModule.initNotifications not found.");
                    }

                    // 7. If we are on the profile page, tell it to load its specific form data
                    // (This relies on profile.html having loadProfilePageData defined globally)
                    if (window.location.pathname.includes('profile.html') && typeof loadProfilePageData === 'function') {
                        loadProfilePageData(user, profileData, imageSource);
                    }

                } catch (error) {
                    console.error("Error loading user session:", error);
                    if (window.UIModule) {
                        window.UIModule.showError("Failed to load your profile. Please try logging in again.");
                    }
                } finally {
                    // Hide loading after all async auth/profile checks are done
                    if (window.UIModule) {
                        window.UIModule.hideLoading();
                    }
                }
            });
        }
        // --- END OF UPDATED AUTH LISTENER ---
        
        // Setup global logout handler
        // Note: This logic is now handled inside setupProfileDropdown
        // We keep it here as a fallback in case that function isn't moved.
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn && window.AuthModule) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await window.AuthModule.signOut();
                } catch (error) {
                    console.error('Logout error:', error);
                    if (window.UIModule) {
                        window.UIModule.showError('Failed to sign out. Please try again.');
                    }
                }
            });
        }

        // --- NEW CODE INSERTED ---
        // Setup global profile button handler
        // Note: This logic is also handled inside setupProfileDropdown
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'profile.html';
            });
        }
        // --- END OF NEW CODE ---
        
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            if (!event.filename || event.filename.includes('.js')) {
                return;
            }
            if (window.UIModule) {
                window.UIModule.showError('An unexpected error occurred. Please refresh the page.');
            }
        });
        
        // Global unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (window.UIModule) {
                window.UIModule.showError('An error occurred while processing your request.');
            }
        });
        
        console.log('CampusCore application initialized successfully');
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
    
    // Service worker registration (for future PWA features)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Uncomment when service worker is implemented
            // navigator.serviceWorker.register('/sw.js')
            //     .then(registration => {
            //         console.log('SW registered: ', registration);
            //     })
            //     .catch(registrationError => {
            //         console.log('SW registration failed: ', registrationError);
            //     });
        });
    }
})();