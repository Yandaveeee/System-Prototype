// Admin Module
window.AdminModule = (function() {
    let currentUser = null;
    let allEvents = [];
    let allResources = [];
    let allLostFound = [];
    let allMarketplace = [];

    // Initialize admin dashboard
    async function initDashboard() {
        try {
            currentUser = window.AuthModule.getCurrentUser();
            if (!currentUser) {
                window.location.href = '../login.html';
                return;
            }
            
            await Promise.all([
                loadStats(),
                loadRecentAnnouncements(),
                loadUpcomingEvents()
            ]);

            window.DatabaseModule.onUsersCountChange((count) => {
                const userStatElement = document.getElementById('stat-users');
                if (userStatElement) {
                    userStatElement.textContent = count;
                }
            });
            
            window.UIModule.hideLoading();
        } catch (error) {
            console.error("Error initializing dashboard:", error);
            window.UIModule.hideLoading();
        }
    }
    
    // Load statistics
    async function loadStats() {
        try {
            const stats = await window.DatabaseModule.getStats();
            const statElements = {
                'stat-users': stats.users,
                'stat-announcements': stats.announcements,
                'stat-events': stats.events,
                'stat-resources': stats.resources,
                'stat-lost-found': stats.lostFound,
                'stat-marketplace': stats.marketplace
            };
            for (const id in statElements) {
                const el = document.getElementById(id);
                if (el) el.textContent = statElements[id];
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    // Load latest announcement for the dashboard
    async function loadRecentAnnouncements() {
        const container = document.getElementById('recent-announcements');
        if (!container) return;
        try {
            const announcements = await window.DatabaseModule.getAnnouncements(5);
            if (announcements.length === 0) {
                container.innerHTML = '<p class="text-center" style="color: var(--text-secondary);">No announcements yet.</p>';
                return;
            }
            announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const latestAnnouncement = announcements[0]; 

            container.innerHTML = `
                <div class="item-card">
                    <h4 class="item-title">${latestAnnouncement.title}</h4>
                    <p class="item-meta">Posted ${window.UIModule.formatRelativeTime(latestAnnouncement.createdAt)}</p>
                    <div class="item-content">${window.UIModule.truncateText(latestAnnouncement.content, 150)}</div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading announcements:', error);
        }
    }
    
    // Load upcoming events for the dashboard
    async function loadUpcomingEvents() {
        const container = document.getElementById('upcoming-events');
        if (!container) return;
        try {
            const events = await window.DatabaseModule.getEvents(10);
            const now = new Date();
            const upcomingEvents = events
                .filter(event => new Date(event.date) > now)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(0, 5);
            
            if (upcomingEvents.length === 0) {
                container.innerHTML = '<p class="text-center" style="color: var(--text-secondary);">No upcoming events.</p>';
            } else {
                container.innerHTML = upcomingEvents.map(event => {
                    const attendeeCount = event.attendees ? Object.keys(event.attendees).length : 0;
                    return `
                        <div class="item-card">
                            <h4 class="item-title">${event.title}</h4>
                            <p class="item-meta">${window.UIModule.formatDate(event.date)} • ${attendeeCount} attending</p>
                            <div class="item-content">${window.UIModule.truncateText(event.description, 100)}</div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    // --- Announcement Management Functions ---
    async function loadAllAnnouncements() {
        const container = document.getElementById('announcements-list');
        if (!container) return; 
        container.innerHTML = '<p class="text-center" style="padding: 2rem;">Loading announcements...</p>';
        try {
            const announcements = await window.DatabaseModule.getAnnouncements(100) || []; 
            announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            if (announcements.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No announcements have been created yet.</p></div>';
                return;
            }
            container.innerHTML = announcements.map(announcement => `
                <div class="list-item">
                    <div>
                        <div class="item-title">${announcement.title}</div>
                        <div class="item-meta">Posted ${window.UIModule.formatRelativeTime(announcement.createdAt)}</div>
                    </div>
                    <div class="item-actions">
                        <button onclick="AdminModule.editAnnouncement('${announcement.id}')" class="btn btn-secondary">Edit</button>
                        <button onclick="AdminModule.deleteAnnouncement('${announcement.id}')" class="btn btn-danger-outline">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading all announcements:', error);
            container.innerHTML = '<p class="text-center message message-error">Could not load announcements.</p>';
        }
    }

    async function editAnnouncement(id) {
        try {
            // Assumes DatabaseModule.getAnnouncementById(id) exists
            const announcement = await window.DatabaseModule.getAnnouncementById(id);
            if (!announcement) {
                window.UIModule.showError('Announcement not found.');
                return;
            }
            const modalContent = `
                <form id="edit-announcement-form">
                    <div class="form-group"><label class="form-label">Title *</label><input type="text" name="title" class="form-input" value="${announcement.title || ''}" required></div>
                    <div class="form-group"><label class="form-label">Content *</label><textarea name="content" class="form-input" rows="4" required>${announcement.content || ''}</textarea></div>
                    <div class="form-group"><label class="form-label"><input type="checkbox" name="priority" ${announcement.priority ? 'checked' : ''}> Priority Announcement</label></div>
                    <div class="flex gap-2" style="justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            `;
            const modal = window.UIModule.createModal('Edit Announcement', modalContent);
            const form = modal.querySelector('#edit-announcement-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const updatedData = {
                    title: formData.get('title'),
                    content: formData.get('content'),
                    priority: formData.has('priority'),
                    updatedAt: new Date().toISOString()
                };
                
                window.UIModule.showLoading();
                // Assumes DatabaseModule.updateAnnouncement(id, data) exists
                await window.DatabaseModule.updateAnnouncement(id, updatedData);
                window.UIModule.hideLoading();
                modal.remove();
                await loadRecentAnnouncements(); // Refresh dashboard widget potentially
                await loadAllAnnouncements(); // Refresh current page list
            });
        } catch (error) {
            window.UIModule.showError('Could not fetch announcement details.');
            console.error(error);
        }
    }
    
    async function deleteAnnouncement(id) {
        const confirmed = await window.UIModule.confirm('Are you sure you want to delete this announcement?', 'Delete Announcement');
        if (confirmed) {
            try {
                window.UIModule.showLoading();
                await window.DatabaseModule.deleteAnnouncement(id);
                window.UIModule.hideLoading();
                window.UIModule.showSuccess('Announcement deleted successfully!');
                await loadRecentAnnouncements(); 
                await loadAllAnnouncements();
                await loadStats();
            } catch (error) {
                window.UIModule.hideLoading();
                window.UIModule.showError('Failed to delete announcement');
                console.error(error);
            }
        }
    }

    // --- Enhanced Event Management ---
    function renderEventsList() {
        const searchInput = document.getElementById('search-events');
        const filterSelect = document.getElementById('filter-events');
        const container = document.getElementById('events-list');
        const emptyState = document.getElementById('events-empty-state');
        
        if (!container || !emptyState) return;

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const filterValue = filterSelect ? filterSelect.value : 'all';
        
        const now = new Date();
        let filteredEvents = allEvents;

        if (filterValue === 'upcoming') {
            filteredEvents = allEvents.filter(event => new Date(event.date) > now);
        } else if (filterValue === 'past') {
            filteredEvents = allEvents.filter(event => new Date(event.date) <= now);
        }

        if (searchTerm) {
            filteredEvents = filteredEvents.filter(event => event.title.toLowerCase().includes(searchTerm));
        }
        
        filteredEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filteredEvents.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            container.innerHTML = filteredEvents.map(event => {
                const attendeeCount = event.attendees ? Object.keys(event.attendees).length : 0;
                const metaInfo = `${window.UIModule.formatDate(event.date)} • ${attendeeCount} attending`;
                return `
                    <div class="list-item">
                        <div>
                            <div class="item-title">${event.title}</div>
                            <div class="item-meta">${metaInfo}</div>
                        </div>
                        <div class="item-actions">
                            <button onclick="AdminModule.editEvent('${event.id}')" class="btn btn-secondary">Edit</button>                            
                            <button onclick="AdminModule.deleteEvent('${event.id}')" class="btn btn-danger-outline">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    async function editEvent(id) {
        try {
            // Assumes DatabaseModule.getEventById(id) exists
            const event = await window.DatabaseModule.getEventById(id);
            if (!event) {
                window.UIModule.showError('Event not found.');
                return;
            }
            // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
            const localDateTime = event.date ? new Date(event.date).toISOString().slice(0, 16) : '';

            const modalContent = `
                <form id="edit-event-form">
                    <div class="form-group"><label class="form-label">Title *</label><input type="text" name="title" class="form-input" value="${event.title || ''}" required></div>
                    <div class="form-group"><label class="form-label">Description *</label><textarea name="description" class="form-input" rows="3" required>${event.description || ''}</textarea></div>
                    <div class="form-group"><label class="form-label">Date & Time *</label><input type="datetime-local" name="date" class="form-input" value="${localDateTime}" required></div>
                    <div class="form-group"><label class="form-label">Location *</label><input type="text" name="location" class="form-input" value="${event.location || ''}" required></div>
                    <div class="flex gap-2" style="justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            `;
            const modal = window.UIModule.createModal('Edit Event', modalContent);
            const form = modal.querySelector('#edit-event-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const updatedData = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    date: new Date(formData.get('date')).toISOString(),
                    location: formData.get('location'),
                    updatedAt: new Date().toISOString()
                };

                window.UIModule.showLoading();
                // Assumes DatabaseModule.updateEvent(id, data) exists
                await window.DatabaseModule.updateEvent(id, updatedData);
                window.UIModule.hideLoading();
                modal.remove();
                await initManageEventsPage(); // Re-fetch and re-render all events data
                await loadUpcomingEvents(); // Refresh dashboard widget
            });
        } catch (error) {
            window.UIModule.showError('Could not fetch event details.');
            console.error(error);
        }
    }

    async function deleteEvent(id) {
        const confirmed = await window.UIModule.confirm('Are you sure you want to delete this event?', 'Delete Event');
        if (confirmed) {
            try {
                window.UIModule.showLoading();
                await window.DatabaseModule.deleteEvent(id);
                window.UIModule.hideLoading();
                window.UIModule.showSuccess('Event deleted successfully!');
                await loadUpcomingEvents(); 
                if (document.getElementById('events-list')) {
                    await initManageEventsPage();
                }
                await loadStats();
            } catch (error) {
                window.UIModule.hideLoading();
                window.UIModule.showError('Failed to delete event');
                console.error(error);
            }
        }
    }
    
    // --- Resources Management ---
    function renderResourcesList() {
        const container = document.getElementById('resources-list');
        if (!container) return;
        const searchInput = document.getElementById('search-resources');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        let filteredResources = allResources.filter(r => r.title.toLowerCase().includes(searchTerm));

        if (filteredResources.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No resources found matching criteria.</p></div>';
        } else {
            container.innerHTML = filteredResources.map(item => `
                <div class="list-item">
                    <div>
                        <div class="item-title"><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a></div>
                        <div class="item-meta">Category: ${item.category} • Added ${window.UIModule.formatRelativeTime(item.createdAt)}</div>
                    </div>
                    <div class="item-actions">
                        <button onclick="AdminModule.editResource('${item.id}')" class="btn btn-secondary">Edit</button>
                        <button onclick="AdminModule.deleteResource('${item.id}')" class="btn btn-danger-outline">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    async function editResource(id) {
        try {
            // Assumes DatabaseModule.getResourceById(id) exists
            const item = await window.DatabaseModule.getResourceById(id);
            if (!item) {
                window.UIModule.showError('Resource not found.');
                return;
            }
            const modalContent = `
                <form id="edit-resource-form">
                    <div class="form-group"><label class="form-label">Title *</label><input type="text" name="title" class="form-input" value="${item.title || ''}" required></div>
                    <div class="form-group"><label class="form-label">Description *</label><textarea name="description" class="form-input" rows="3" required>${item.description || ''}</textarea></div>
                    <div class="form-group">
                        <label class="form-label">Category *</label>
                        <select name="category" class="form-input" required>
                            <option value="textbook" ${item.category === 'textbook' ? 'selected' : ''}>Textbooks</option>
                            <option value="notes" ${item.category === 'notes' ? 'selected' : ''}>Study Notes</option>
                            <option value="other" ${item.category === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="form-group"><label class="form-label">Resource URL *</label><input type="url" name="url" class="form-input" value="${item.url || ''}" required placeholder="https://..."></div>
                    <div class="flex gap-2" style="justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            `;
            const modal = window.UIModule.createModal('Edit Resource', modalContent);
            const form = modal.querySelector('#edit-resource-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const updatedData = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    category: formData.get('category'),
                    url: formData.get('url'),
                    updatedAt: new Date().toISOString()
                };
                
                window.UIModule.showLoading();
                // Assumes DatabaseModule.updateResource(id, data) exists
                await window.DatabaseModule.updateResource(id, updatedData);
                window.UIModule.hideLoading();
                modal.remove();
                await initManageResourcesPage();
            });
        } catch (error) {
            window.UIModule.showError('Could not fetch resource details.');
            console.error(error);
        }
    }

    async function deleteResource(id) {
        if (await window.UIModule.confirm('Are you sure you want to delete this resource?', 'Delete Resource')) {
            try {
                window.UIModule.showLoading();
                await window.DatabaseModule.deleteResource(id);
                window.UIModule.hideLoading();
                window.UIModule.showSuccess('Resource deleted.');
                await initManageResourcesPage();
                await loadStats();
            } catch (error) {
                window.UIModule.hideLoading();
                window.UIModule.showError('Failed to delete resource.');
            }
        }
    }

    // --- Lost & Found Management ---
    function renderLostFoundList() {
        const container = document.getElementById('lost-found-list');
        if(!container) return;
        const searchInput = document.getElementById('search-lost-found');
        const filterSelect = document.getElementById('filter-lost-found');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const filterValue = filterSelect ? filterSelect.value : 'all';
        
        let filteredItems = allLostFound;
        if (filterValue !== 'all') {
            filteredItems = filteredItems.filter(item => item.type === filterValue);
        }
        if (searchTerm) {
            filteredItems = filteredItems.filter(item => item.title.toLowerCase().includes(searchTerm));
        }
        
        filteredItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (filteredItems.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No items found matching criteria.</p></div>';
        } else {
            container.innerHTML = filteredItems.map(item => `
                <div class="list-item">
                    <div>
                        <div class="item-title">${item.title}</div>
                        <div class="item-meta">Type: ${item.type} | Status: ${item.status} | Reported: ${window.UIModule.formatRelativeTime(item.createdAt)}</div>
                    </div>
                    <div class="item-actions">
                        <button onclick="AdminModule.editLostFoundItem('${item.id}')" class="btn btn-secondary">Edit</button>
                        <button onclick="AdminModule.deleteLostFoundItem('${item.id}')" class="btn btn-danger-outline">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    async function editLostFoundItem(id) {
        try {
            // Assumes DatabaseModule.getLostFoundItemById(id) exists
            const item = await window.DatabaseModule.getLostFoundItemById(id);
            if (!item) {
                window.UIModule.showError('Item not found.');
                return;
            }
            const modalContent = `
                <form id="edit-lostfound-form">
                    <div class="form-group"><label class="form-label">Item Title *</label><input type="text" name="title" class="form-input" value="${item.title || ''}" required></div>
                    <div class="form-group"><label class="form-label">Description</label><textarea name="description" class="form-input" rows="3">${item.description || ''}</textarea></div>
                    <div class="form-group">
                        <label class="form-label">Type *</label>
                        <select name="type" class="form-input" required>
                            <option value="lost" ${item.type === 'lost' ? 'selected' : ''}>Lost Item</option>
                            <option value="found" ${item.type === 'found' ? 'selected' : ''}>Found Item</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status *</label>
                        <select name="status" class="form-input" required>
                            <option value="active" ${item.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="claimed" ${item.status === 'claimed' ? 'selected' : ''}>Claimed</option>
                        </select>
                    </div>
                    <div class="flex gap-2" style="justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>Initial state for a boolean toggle
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            `;
            const modal = window.UIModule.createModal('Edit Lost & Found Item', modalContent);
            const form = modal.querySelector('#edit-lostfound-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const updatedData = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    type: formData.get('type'),
                    status: formData.get('status'),
                    updatedAt: new Date().toISOString()
                };

                window.UIModule.showLoading();
                // Assumes DatabaseModule.updateLostFoundItem(id, data) exists
                await window.DatabaseModule.updateLostFoundItem(id, updatedData);
                window.UIModule.hideLoading();
                modal.remove();
                await initManageLostFoundPage();
            });
        } catch (error) {
            window.UIModule.showError('Could not fetch item details.');
            console.error(error);
        }
    }

    async function deleteLostFoundItem(id) {
        if (await window.UIModule.confirm('Are you sure you want to delete this item?', 'Delete Item')) {
            try {
                window.UIModule.showLoading();
                await window.DatabaseModule.deleteLostFoundItem(id);
                window.UIModule.hideLoading();
                window.UIModule.showSuccess('Item deleted.');
                await initManageLostFoundPage();
                await loadStats();
            } catch(error) {
                window.UIModule.hideLoading();
                window.UIModule.showError('Failed to delete item.');
            }
        }
    }

    // --- Marketplace Management ---
    function renderMarketplaceList() {
        const container = document.getElementById('marketplace-list');
        if(!container) return;
        const searchInput = document.getElementById('search-marketplace');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        let filteredItems = allMarketplace.filter(item => item.title.toLowerCase().includes(searchTerm));
        
        filteredItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (filteredItems.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No items found matching criteria.</p></div>';
        } else {
            container.innerHTML = filteredItems.map(item => `
                <div class="list-item">
                    <div>
                        <div class="item-title">${item.title} ($${item.price})</div>
                        <div class="item-meta">Seller: ${item.userName || 'N/A'} • Listed: ${window.UIModule.formatRelativeTime(item.createdAt)}</div>
                    </div>
                    <div class="item-actions">
                        <button onclick="AdminModule.editMarketplaceItem('${item.id}')" class="btn btn-secondary">Edit</button>
                        <button onclick="AdminModule.deleteMarketplaceItem('${item.id}')" class="btn btn-danger-outline">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    async function editMarketplaceItem(id) {
        try {
            // Assumes DatabaseModule.getMarketplaceItemById(id) exists
            const item = await window.DatabaseModule.getMarketplaceItemById(id);
            if (!item) {
                window.UIModule.showError('Item not found.');
                return;
            }
            const modalContent = `
                <form id="edit-marketplace-form">
                    <div class="form-group"><label class="form-label">Item Title *</label><input type="text" name="title" class="form-input" value="${item.title || ''}" required></div>
                    <div class="form-group"><label class="form-label">Price *</label><input type="number" name="price" step="0.01" min="0" class="form-input" value="${item.price || ''}" required></div>
                    <div class="form-group"><label class="form-label">Description</label><textarea name="description" class="form-input" rows="3">${item.description || ''}</textarea></div>
                    <div class="flex gap-2" style="justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>Initial state for a boolean toggle
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>_CHAR_LIMIT = 2000000_CHAR_LIMIT = 2000000
            `;
            const modal = window.UIModule.createModal('Edit Marketplace Item', modalContent);
            const form = modal.querySelector('#edit-marketplace-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const updatedData = {
                    title: formData.get('title'),
                    price: parseFloat(formData.get('price')),
                    description: formData.get('description'),
                    updatedAt: new Date().toISOString()
                };

                window.UIModule.showLoading();
                // Assumes DatabaseModule.updateMarketplaceItem(id, data) exists
                await window.DatabaseModule.updateMarketplaceItem(id, updatedData);
                window.UIModule.hideLoading();
                modal.remove();
                await initManageMarketplacePage();
            });
        } catch (error) {
            window.UIModule.showError('Could not fetch item details.');
            console.error(error);
        }
    }

    async function deleteMarketplaceItem(id) {
        if (await window.UIModule.confirm('Are you sure you want to delete this marketplace item?', 'Delete Item')) {
            try {
                window.UIModule.showLoading();
                await window.DatabaseModule.deleteMarketplaceItem(id);
                window.UIModule.hideLoading();
                window.UIModule.showSuccess('Item deleted.');
                await initManageMarketplacePage();
                await loadStats();
            } catch (error) {
                window.UIModule.hideLoading();
                window.UIModule.showError('Failed to delete item.');
            }
        }
    }

    // --- Page Initializers ---
    function initManageAnnouncementsPage() { loadAllAnnouncements(); }

    async function initManageEventsPage() {
        const searchInput = document.getElementById('search-events');
        const filterSelect = document.getElementById('filter-events');
        
        if(searchInput) searchInput.addEventListener('keyup', renderEventsList);
        if(filterSelect) filterSelect.addEventListener('change', renderEventsList);

        try {
            window.UIModule.showLoading();
            allEvents = await window.DatabaseModule.getEvents(200) || [];
            renderEventsList();
            window.UIModule.hideLoading();
        } catch (error) {
            console.error("Failed to load events:", error);
            window.UIModule.hideLoading();
        }
    }

    async function initManageResourcesPage() {
        const searchInput = document.getElementById('search-resources');
        if(searchInput) searchInput.addEventListener('keyup', renderResourcesList);
        allResources = await window.DatabaseModule.getResources(null, 200) || [];
        renderResourcesList();
    }
    async function initManageLostFoundPage() {
        const searchInput = document.getElementById('search-lost-found');
        const filterSelect = document.getElementById('filter-lost-found');
        if(searchInput) searchInput.addEventListener('keyup', renderLostFoundList);
        if(filterSelect) filterSelect.addEventListener('change', renderLostFoundList);
        allLostFound = await window.DatabaseModule.getLostFoundItems(null, 200) || [];
        renderLostFoundList();
    }
    async function initManageMarketplacePage() {
        const searchInput = document.getElementById('search-marketplace');
        if(searchInput) searchInput.addEventListener('keyup', renderMarketplaceList);
        allMarketplace = await window.DatabaseModule.getMarketplaceItems(null, 200) || [];
        renderMarketplaceList();
    }

    // --- Quick Action Functions (Modals) ---
    function createAnnouncement() {
        const modalContent = `
            <form id="announcement-form">
                <div class="form-group"><label class="form-label">Title *</label><input type="text" name="title" class="form-input" required></div>
                <div class="form-group"><label class="form-label">Content *</label><textarea name="content" class="form-input" rows="4" required></textarea></div>
                <div class="form-group"><label class="form-label"><input type="checkbox" name="priority"> Priority Announcement</label></div>
                <div class="flex gap-2" style="justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Announcement</button>
                </div>
            </form>
        `;
        const modal = window.UIModule.createModal('Create Announcement', modalContent);
        const form = modal.querySelector('#announcement-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const user = window.AuthModule.getCurrentUser();
            const data = {
                title: formData.get('title'),
                content: formData.get('content'),
                priority: formData.has('priority'),
                authorId: user.uid,
                createdAt: new Date().toISOString()
            };
            
            try {
                window.UIModule.showLoading();
                await window.DatabaseModule.createAnnouncement(data);
                window.UIModule.hideLoading();
                modal.remove();
                await loadRecentAnnouncements(); 
                if (document.getElementById('announcements-list')) {
                    await loadAllAnnouncements();
                }
                await loadStats();
            } catch (error) {
                window.UIModule.hideLoading();
                window.UIModule.showError('Failed to create announcement.');
            }
        });
    }
    
    function createEvent() {
        const modalContent = `
            <form id="event-form">
                <div class="form-group"><label class="form-label">Title *</label><input type="text" name="title" class="form-input" required></div>
                <div class="form-group"><label class="form-label">Description *</label><textarea name="description" class="form-input" rows="3" required></textarea></div>
                <div class="form-group"><label class="form-label">Date & Time *</label><input type="datetime-local" name="date" class="form-input" required></div>
                <div class="form-group"><label class="form-label">Location *</label><input type="text" name="location" class="form-input" required></div>
                <div class="flex gap-2" style="justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Event</button>
                </div>
            </form>
        `;
        const modal = window.UIModule.createModal('Create Event', modalContent);
        const form = modal.querySelector('#event-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = window.AuthModule.getCurrentUser();
            if (!user) { return window.UIModule.showError("You are not logged in."); }
            
            const formData = new FormData(form);
            const eventData = {
                title: formData.get('title'),
                description: formData.get('description'),
                date: new Date(formData.get('date')).toISOString(),
                location: formData.get('location'),
                organizerId: user.uid,
                organizerName: user.displayName || user.email,
                createdAt: new Date().toISOString()
            };
            
            try {
                window.UIModule.showLoading();
                await window.DatabaseModule.createEvent(eventData);
                modal.remove();
                window.UIModule.hideLoading();
                window.UIModule.showSuccess('Event created successfully!');
                await loadUpcomingEvents();
                if (document.getElementById('events-list')) {
                    await initManageEventsPage();
                }
                await loadStats();
            } catch (error) {
                window.UIModule.hideLoading();
                window.UIModule.showError('Failed to create event');
                console.error(error);
            }
        });
    }
    
    function addResource() {
        const modalContent = `
            <form id="resource-form">
                <div class="form-group"><label class="form-label">Title *</label><input type="text" name="title" class="form-input" required></div>
                <div class="form-group"><label class="form-label">Description *</label><textarea name="description" class="form-input" rows="3" required></textarea></div>
                <div class="form-group">
                    <label class="form-label">Category *</label>
                    <select name="category" class="form-input" required>
                        <option value="">Select category</option><option value="textbook">Textbooks</option><option value="notes">Study Notes</option><option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group"><label class="form-label">Resource URL *</label><input type="url" name="url" class="form-input" required placeholder="https://..."></div>
                <div class="flex gap-2" style="justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Resource</button>
                </div>
            </form>
        `;
        const modal = window.UIModule.createModal('Add Resource', modalContent);
        const form = modal.querySelector('#resource-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const user = window.AuthModule.getCurrentUser();
            const resourceData = {
                title: formData.get('title'),
                description: formData.get('description'),
                category: formData.get('category'),
                url: formData.get('url'),
                addedBy: user.uid,
                createdAt: new Date().toISOString()
            };
            try {
                window.UIModule.showLoading();
                await window.DatabaseModule.addResource(resourceData);
                window.UIModule.hideLoading();
                modal.remove();
                if (document.getElementById('resources-list')) {
                     await initManageResourcesPage();
                }
                await loadStats();
            } catch (error) {
                window.UIModule.hideLoading();
                window.UIModule.showError('Failed to add resource.');
            }
        });
    }

    // Public API
    return {
        initDashboard,
        createAnnouncement,
        createEvent,
        addResource,
        deleteAnnouncement,
        deleteEvent,
        deleteResource,
        deleteLostFoundItem,
        deleteMarketplaceItem,
        editAnnouncement,
        editEvent,
        editResource,
        editLostFoundItem,
        editMarketplaceItem,
        initManageAnnouncementsPage,
        initManageEventsPage,
        initManageResourcesPage,
        initManageLostFoundPage,
        initManageMarketplacePage
    };
})();