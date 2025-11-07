// UI Module
window.UIModule = (function() {
    
    // Show loading overlay
    function showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            // Using style.display to be consistent with your other files
            loading.style.display = 'flex';
        }
    }
    
    // Hide loading overlay
    function hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            // Using style.display to be consistent with your other files
            loading.style.display = 'none';
        }
    }
    
    // Show message
    function showMessage(message, type = 'info', container = null, duration = 5000) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        const targetContainer = container || document.querySelector('.main-container') || document.body;
        targetContainer.insertBefore(messageDiv, targetContainer.firstChild);
        
        if (duration > 0) {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, duration);
        }
        
        return messageDiv;
    }
    
    // Show error message
    function showError(message, container = null) {
        // Using alert to be consistent with your other files
        alert(message);
        return showMessage(message, 'error', container);
    }
    
    // Show success message
    function showSuccess(message, container = null) {
        return showMessage(message, 'success', container);
    }
    
    // Show warning message
    function showWarning(message, container = null) {
        return showMessage(message, 'warning', container);
    }
    
    // Clear all messages
    function clearMessages() {
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
    }
    
    // Format date
    function formatDate(dateString, options = {}) {
        const date = new Date(dateString);
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
    }
    
    // Format relative time (e.g., "2 hours ago")
    function formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'week', seconds: 604800 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 },
            { label: 'second', seconds: 1 }
        ];
        
        for (const interval of intervals) {
            const count = Math.floor(diffInSeconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
            }
        }
        
        return 'just now';
    }
    
    // Create modal
    function createModal(title, content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="close-btn" type="button">&times;</button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;
        
        // Close modal functionality
        const closeBtn = modal.querySelector('.close-btn');
        const closeModal = () => {
            document.body.removeChild(modal);
            if (options.onClose) options.onClose();
        };
        
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Escape key handler
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        document.body.appendChild(modal);
        return modal;
    }
    
    // Confirm dialog
    function confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const content = `
                <p>${message}</p>
                <div class="flex gap-2" style="justify-content: flex-end; margin-top: 1rem;">
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                    <button class="btn btn-danger confirm-btn">Confirm</button>
                </div>
            `;
            
            const modal = createModal(title, content);
            const cancelBtn = modal.querySelector('.cancel-btn');
            const confirmBtn = modal.querySelector('.confirm-btn');
            
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
            
            confirmBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });
        });
    }

    // --- NEW FUNCTIONS (from profile.html) ---

    // Handles logout
    async function handleLogout() {
        showLoading();
        try {
            if (window.AuthModule && typeof window.AuthModule.signOut === 'function') {
                await window.AuthModule.signOut();
                window.location.href = '../login.html'; // Adjust path if needed
            } else {
                console.error("AuthModule or signOut function not found!");
                window.location.href = '../login.html';
            }
        } catch (error) {
            console.error("Logout failed:", error);
            showError("Logout failed. Please try again.");
            hideLoading();
        }
    }

    // Updates header avatar (works with Base64)
    function updateHeaderAvatar(imageUrl, displayName) {
         const avatar = document.getElementById('header-user-avatar');
         if (!avatar) return;
         const initial = (displayName || 'S').charAt(0).toUpperCase();
         avatar.innerHTML = imageUrl ? `<img src="${imageUrl}" alt="Profile" class="h-full w-full object-cover">` : initial;
    }

    // Helper for notifications
    function markAnnouncementAsRead(userId, announcementId) {
        if (firebase && firebase.database) {
            const readStatusRef = firebase.database().ref(`user_read_status/announcements/${userId}/${announcementId}`);
            readStatusRef.set(true).catch(error => { console.error("Failed to mark as read:", error); });
        } else {
            console.warn("Firebase Database not available. Cannot mark as read.");
        }
    }

    // Main function to build profile dropdown
    function setupProfileDropdown(user, dbProfileData, imageSource) {
        const userProfileButton = document.getElementById('user-profile-btn');
        const dropdown = document.getElementById('profile-dropdown');
        if (!userProfileButton || !dropdown || !user) return;

        const displayName = user.displayName || dbProfileData?.fullName || user.email.split('@')[0];

        document.getElementById('profile-dropdown-name').textContent = displayName;
        document.getElementById('profile-dropdown-email').textContent = user.email || 'No Email';
        
        updateHeaderAvatar(imageSource, displayName); 

        userProfileButton.addEventListener('click', (event) => {
            event.stopPropagation();
            dropdown.classList.toggle('hidden');
            document.getElementById('notification-dropdown')?.classList.add('hidden');
        });
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }

    // Main function to build notifications
    function initNotifications(user) {
        if (!firebase || !firebase.database) {
            console.warn("Firebase Database not loaded, skipping notifications.");
            return;
        }

        const bell = document.getElementById('notification-bell');
        const badge = document.getElementById('notification-badge');
        
        // --- THIS WAS THE FIX ---
        // Renamed from 'dropdown' to avoid conflict
        const notifDropdown = document.getElementById('notification-dropdown'); 
        
        const list = document.getElementById('notification-list');
        // Use the new variable name
        const emptyState = notifDropdown.querySelector('.notification-empty'); 
        const userId = user.uid;

        // Use the new variable name
        if (!bell || !badge || !notifDropdown || !list || !emptyState) { 
            console.warn("Notification UI elements not found! Skipping init."); 
            return; 
        }

        bell.addEventListener('click', (event) => {
            event.stopPropagation();
            notifDropdown.classList.toggle('hidden'); // Use new variable
            document.getElementById('profile-dropdown')?.classList.add('hidden');
        });
        
        const announcementsRef = firebase.database().ref('announcements');
        const readStatusRef = firebase.database().ref(`user_read_status/announcements/${userId}`);
        let allAnnouncements = {};
        let readAnnouncements = {};

        function checkUnread() {
            let unreadCount = 0; 
            if (!list || !emptyState) return;
            list.innerHTML = ''; // Clear list
            const announcementKeys = Object.keys(allAnnouncements);
            announcementKeys.sort((a,b) => (allAnnouncements[b].timestamp || 0) - (allAnnouncements[a].timestamp || 0));
            
            announcementKeys.forEach(key => {
                if (!readAnnouncements[key]) {
                    unreadCount++; 
                    const ann = allAnnouncements[key];
                    const listItem = document.createElement('li');
                    listItem.className = 'block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer';
                    listItem.dataset.announcementId = key;
                    listItem.innerHTML = `<p class="font-medium text-gray-900 truncate">${ann.title || 'Untitled'}</p><p class="text-xs text-gray-500">${new Date(ann.timestamp || Date.now()).toLocaleDateString()}</p>`;
                    listItem.addEventListener('click', () => { 
                        markAnnouncementAsRead(userId, key); 
                        window.location.href = `announcements.html#${key}`; 
                    });
                    list.appendChild(listItem);
                }
            });
            
            if(badge) badge.classList.toggle('visible', unreadCount > 0);
            if(emptyState) emptyState.classList.toggle('hidden', unreadCount > 0);
            if (unreadCount === 0) { 
                list.appendChild(emptyState); 
            }
        }
        
        announcementsRef.on('value', (snapshot) => { allAnnouncements = snapshot.val() || {}; checkUnread(); }, (error) => { console.error(error); });
        readStatusRef.on('value', (snapshot) => { readAnnouncements = snapshot.val() || {}; checkUnread(); }, (error) => { console.error(error); });
    }
    
    // --- END OF NEW FUNCTIONS ---


    // Truncate text
    function truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Get URL parameters
    function getUrlParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }
    
    // Set URL parameter without reload
    function setUrlParam(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        window.history.pushState({}, '', url);
    }
    
    // Validate email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Validate form
    function validateForm(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return false;
        
        let isValid = true;
        const errors = {};
        
        for (const [fieldName, fieldRules] of Object.entries(rules)) {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (!field) continue;
            
            const value = field.value.trim();
            
            // Required validation
            if (fieldRules.required && !value) {
                errors[fieldName] = `${fieldRules.label || fieldName} is required`;
                isValid = false;
                continue;
            }
            
            // Min length validation
            if (fieldRules.minLength && value.length < fieldRules.minLength) {
                errors[fieldName] = `${fieldRules.label || fieldName} must be at least ${fieldRules.minLength} characters`;
                isValid = false;
                continue;
            }
            
            // Email validation
            if (fieldRules.email && value && !isValidEmail(value)) {
                errors[fieldName] = 'Please enter a valid email address';
                isValid = false;
                continue;
            }
            
            // Custom validation
            if (fieldRules.validate && !fieldRules.validate(value)) {
                errors[fieldName] = fieldRules.message || `${fieldRules.label || fieldName} is invalid`;
                isValid = false;
                continue;
            }
        }
        
        // Display errors
        for (const [fieldName, errorMessage] of Object.entries(errors)) {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field) {
                field.classList.add('error');
                
                // Remove existing error message
                const existingError = field.parentNode.querySelector('.field-error');
                if (existingError) {
                    existingError.remove();
                }
                
                // Add new error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'field-error';
                errorDiv.style.color = 'var(--danger-red)';
                errorDiv.style.fontSize = '0.875rem';
                errorDiv.style.marginTop = '0.25rem';
                errorDiv.textContent = errorMessage;
                field.parentNode.appendChild(errorDiv);
            }
        }
        
        // Clear errors for valid fields
        for (const fieldName of Object.keys(rules)) {
            if (!errors[fieldName]) {
                const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
                if (field) {
                    field.classList.remove('error');
                    const existingError = field.parentNode.querySelector('.field-error');
                    if (existingError) {
                        existingError.remove();
                    }
                }
            }
        }
        
        return isValid;
    }
    
    // Public API
    return {
        showLoading,
        hideLoading,
        showMessage,
        showError,
        showSuccess,
        showWarning,
        clearMessages,
        formatDate,
        formatRelativeTime,
        createModal,
        confirm,
        // updateUserDisplay, // This is now replaced by setupProfileDropdown
        truncateText,
        debounce,
        getUrlParam,
        setUrlParam,
        isValidEmail,
        validateForm,

        // --- ADDED TO EXPORTS ---
        setupProfileDropdown,
        initNotifications
    };
})();