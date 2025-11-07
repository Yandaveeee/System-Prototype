// Student Module
window.StudentModule = (function() {
    let currentUser = null;
    let allLostFoundItems = {}; // Property to store all lost/found items
    let currentLostFoundFilter = 'all'; // Stores the currently selected filter ('all', 'lost', 'found', 'resolved')

    // Initialize student dashboard
    async function initDashboard() {
        try {
            currentUser = window.AuthModule.getCurrentUser();
            if (!currentUser) {
                window.location.href = '/login.html';
                return;
            }

            // This function from your code was trying to load user stats,
            // but for the dashboard, we just need the welcome message.
            const welcomeMessage = document.querySelector('.welcome-section h1'); // Assuming this exists or adjust selector
            if (welcomeMessage && currentUser) {
                const displayName = currentUser.displayName || currentUser.email.split('@')[0];
                welcomeMessage.textContent = `Welcome back, ${displayName}!`;
            }

            // Load dashboard data
            await Promise.all([
                loadRecentAnnouncements(),
                loadUpcomingEvents(),
                loadRecentResources()
            ]);

            window.UIModule.hideLoading();
        } catch (error) {
            console.error('Error initializing student dashboard:', error);
            window.UIModule.showError('Failed to load dashboard data');
            window.UIModule.hideLoading();
        }
    }
    

    // --- PROFILE PAGE ---
    async function initProfilePage() {
        try {
            currentUser = window.AuthModule.getCurrentUser();
            if (!currentUser) { window.location.href = '../login.html'; return; } // Adjusted path

            const profileData = await window.DatabaseModule.getUserProfile(currentUser.uid);

            // Populate the form fields
            document.getElementById('profile-name').value = currentUser.displayName || profileData?.fullName || ''; // Use Auth displayName first
            document.getElementById('profile-email').value = currentUser.email || '';
            document.getElementById('profile-student-id').value = profileData?.studentId || 'Not set';

            // Add event listener for the save button
            const saveBtn = document.getElementById('save-profile-btn');
            if(saveBtn) { // Make sure button exists
                saveBtn.addEventListener('click', async (event) => {
                    event.preventDefault(); // Good practice for button clicks in forms
                    const newFullName = document.getElementById('profile-name').value.trim(); // Trim whitespace

                    if (!newFullName) {
                        window.UIModule.showError("Full name cannot be empty.");
                        return;
                    }

                    window.UIModule.showLoading();
                    try {
                        // Prepare updates
                        const authUpdates = {};
                        const dbUpdates = {};

                        if (newFullName !== (currentUser.displayName || '')) {
                            authUpdates.displayName = newFullName;
                        }
                        // Always update DB fullName if different from current value
                        if (newFullName !== (profileData?.fullName || '')) {
                             dbUpdates.fullName = newFullName;
                        }

                        // Update Firebase Auth Profile if needed
                        if (Object.keys(authUpdates).length > 0) {
                            await window.AuthModule.updateAuthProfile(authUpdates);
                             // Refresh currentUser in case displayName changed
                             currentUser = window.AuthModule.getCurrentUser();
                        }
                        // Update Realtime Database if needed
                        if (Object.keys(dbUpdates).length > 0) {
                            await window.DatabaseModule.updateUserProfile(currentUser.uid, dbUpdates);
                        }

                        window.UIModule.hideLoading();
                        window.UIModule.showSuccess('Profile updated successfully!');
                        // Optionally re-fetch profileData if needed immediately
                        // const updatedProfileData = await window.DatabaseModule.getUserProfile(currentUser.uid);

                    } catch (error) {
                        window.UIModule.hideLoading();
                        window.UIModule.showError(`Profile update failed: ${error.message}`);
                        console.error("Profile update error:", error);
                    }
                });
                saveBtn.disabled = false; // Enable after loading profile
            } else {
                 console.warn("Save profile button not found.");
            }
        } catch (error) {
             console.error("Error initializing profile page:", error);
             window.UIModule.showError("Failed to load profile."); // Show generic error
             window.UIModule.hideLoading(); // Ensure loading is hidden on error
        }
    }

    // Load recent announcements
    async function loadRecentAnnouncements() {
        try {
            // Assuming getAnnouncements fetches and sorts by timestamp descending
            const announcements = await window.DatabaseModule.getAnnouncements(2); // Fetch 2 for dashboard
            const container = document.getElementById('recent-announcements');

            if (container) {
                if (!announcements || announcements.length === 0) {
                    container.innerHTML = '<p class="text-center text-gray-500 py-4">No recent announcements.</p>';
                } else {
                    // Use the NEW Tailwind HTML structure for dashboard preview
                    container.innerHTML = announcements.map(ann => {
                         let priorityBadge = '';
                         if (ann.priority) {
                              let badgeClass = 'bg-gray-100 text-gray-800'; // Default/Low
                              if (ann.priority === 'High') badgeClass = 'bg-red-100 text-red-800';
                              else if (ann.priority === 'Medium') badgeClass = 'bg-yellow-100 text-yellow-800';
                              priorityBadge = `<span class="text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}">${ann.priority}</span>`;
                         }
                         return `
                            <div class="p-4 bg-gray-50 rounded-md border border-gray-200">
                                <div class="flex justify-between items-start">
                                    <h4 class="font-medium text-gray-900">${ann.title}</h4>
                                    ${priorityBadge}
                                </div>
                                <p class="text-sm text-gray-600 mt-1">${window.UIModule.truncateText(ann.content, 100)}</p>
                                <p class="text-xs text-gray-400 mt-2">Published on: ${new Date(ann.timestamp).toLocaleDateString()}</p>
                            </div>
                         `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Error loading announcements:', error);
            const container = document.getElementById('recent-announcements');
            if(container) container.innerHTML = '<p class="text-center text-red-500 py-4">Could not load announcements.</p>';
        }
    }

    // Load upcoming events
    async function loadUpcomingEvents() {
        try {
            const events = await window.DatabaseModule.getEvents(10); // Fetch more initially for filtering
            const container = document.getElementById('upcoming-events');

            if (container) {
                const now = new Date();
                // Filter for upcoming AND sort ascending AND take the first 2
                const upcomingEvents = events
                    .filter(event => new Date(event.date) >= now)
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .slice(0, 2);

                if (upcomingEvents.length === 0) {
                    container.innerHTML = '<p class="text-center text-gray-500 py-4">No upcoming events.</p>';
                } else {
                    // Use the NEW Tailwind HTML structure for dashboard preview
                    container.innerHTML = upcomingEvents.map(event => {
                         const eventDate = new Date(event.date);
                         const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                         const day = eventDate.getDate();
                         return `
                            <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                                <div class="flex-shrink-0 flex flex-col items-center justify-center h-16 w-16 rounded-md bg-indigo-600 text-white text-center">
                                    <span class="text-xs font-medium uppercase">${month}</span>
                                    <span class="text-xl font-bold leading-none">${day}</span>
                                </div>
                                <div class="flex-grow">
                                    <h4 class="font-medium text-gray-900">${event.title}</h4>
                                    <p class="text-sm text-gray-500">${eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} @ ${event.location}</p>
                                </div>
                            </div>
                         `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Error loading events:', error);
             const container = document.getElementById('upcoming-events');
            if(container) container.innerHTML = '<p class="text-center text-red-500 py-4">Could not load events.</p>';
        }
    }
    

    // Load recent resources
    async function loadRecentResources() {
        try {
            // Assuming getResources fetches and sorts by timestamp descending
            const resources = await window.DatabaseModule.getResources(null, 3); // Fetch 3 for dashboard
            const container = document.getElementById('recent-resources');

            if (container) {
                if (!resources || resources.length === 0) {
                    container.innerHTML = '<p class="text-center text-gray-500 py-4">No recent resources.</p>';
                } else {
                    // Use the NEW Tailwind HTML structure for dashboard preview
                    container.innerHTML = resources.map(res => `
                        <a href="${res.link}" target="_blank" rel="noopener noreferrer" class="block p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors">
                            <div class="font-medium text-sm text-gray-900 truncate">${res.title}</div>
                            <div class="text-xs text-gray-500">${res.category}</div>
                        </a>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading resources:', error);
             const container = document.getElementById('recent-resources');
            if(container) container.innerHTML = '<p class="text-center text-red-500 py-4">Could not load resources.</p>';
        }
    }

    // RSVP to event
    async function rsvpEvent(eventId) {
        // Keep your existing rsvpEvent logic
        try {
            if (!currentUser) {
                currentUser = window.AuthModule.getCurrentUser();
                if (!currentUser) return;
            }

            const userData = {
                uid: currentUser.uid,
                name: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email
            };

            await window.DatabaseModule.rsvpEvent(eventId, currentUser.uid, userData);
            window.UIModule.showSuccess('RSVP successful!');

            // Refresh lists if they exist on the current page
            if (document.getElementById('upcoming-events')) {
                await loadUpcomingEvents();
            }
            if (document.getElementById('events-list')) {
                await loadAllEvents(); // Assumes loadAllEvents updates RSVP status display
            }
        } catch (error) {
            console.error('Error RSVPing to event:', error);
            window.UIModule.showError('Failed to RSVP. Please try again.');
        }
    }

    // Load all announcements (for announcements page)
    async function loadAllAnnouncements() {
        // Keep your existing loadAllAnnouncements logic
        // BUT ensure it calls renderAnnouncements at the end
         try {
            window.UIModule.showLoading();
            const announcementsRef = firebase.database().ref('announcements').orderByChild('timestamp');
            announcementsRef.on('value', snapshot => { // Use 'on' for real-time updates
                StudentModule.allAnnouncements = snapshot.val() || {}; // Store data
                renderAnnouncements(); // Call render function
                window.UIModule.hideLoading();
            }, error => {
                 console.error('Error loading announcements:', error);
                 window.UIModule.showError('Failed to load announcements');
                 window.UIModule.hideLoading();
                 const container = document.getElementById('announcements-list');
                 if(container) container.innerHTML = '<p class="text-center text-red-500 py-10">Could not load announcements.</p>';
            });
        } catch (error) {
            console.error('Error setting up announcements listener:', error);
            window.UIModule.showError('Failed to load announcements');
            window.UIModule.hideLoading();
        }
    }

    // Load all events (for events page)
    async function loadAllEvents() {
        // Keep your existing loadAllEvents logic
        // BUT ensure it calls renderEvents at the end
        try {
            currentUser = window.AuthModule.getCurrentUser(); // Ensure currentUser is set
            window.UIModule.showLoading();
            const eventsRef = firebase.database().ref('events').orderByChild('date'); // Use 'date'
            eventsRef.on('value', snapshot => { // Use 'on' for real-time updates
                StudentModule.allEvents = snapshot.val() || {}; // Store data
                renderEvents(); // Call render function
                window.UIModule.hideLoading();
            }, error => {
                console.error('Error loading events:', error);
                window.UIModule.showError('Failed to load events');
                window.UIModule.hideLoading();
                const container = document.getElementById('events-list');
                if(container) container.innerHTML = '<p class="text-center text-red-500 py-10">Could not load events.</p>';
            });
        } catch (error) {
            console.error('Error setting up events listener:', error);
            window.UIModule.showError('Failed to load events');
            window.UIModule.hideLoading();
        }
    }

    // Initialize specific pages
    function initAnnouncementsPage() {
        loadAllAnnouncements(); // Changed to use the listener version
    }

    function initEventsPage() {
        loadAllEvents(); // Changed to use the listener version
    }

    // --- Resources Page ---
    async function initResourcesPage() {
        // Keep your existing initResourcesPage logic
        // BUT ensure it calls a renderResources function
         const container = document.getElementById('resources-list'); // Assuming this ID exists
        if (!container) return;
        container.innerHTML = '<p class="text-center text-gray-500 py-10">Loading resources...</p>';
        try {
            const resourcesRef = firebase.database().ref('resources').orderByChild('timestamp');
            resourcesRef.on('value', snapshot => {
                StudentModule.allResources = snapshot.val() || {}; // Store data
                renderResources(); // Call render function
            }, error => {
                console.error("Error fetching resources:", error);
                container.innerHTML = '<p class="text-center text-red-500 py-10">Could not load resources.</p>';
            });
        } catch(e){
             console.error("Error setting up resources listener:", error);
            container.innerHTML = '<p class="text-center text-red-500 py-10">Error initializing page.</p>';
        }
    }

    // --- Lost & Found Page (UPDATED) ---
    async function initLostFoundPage() {
        console.log("Initializing lost & found page..."); // Add log
        const container = document.getElementById('lost-found-list');
        if (!container) {
            console.error("Lost & Found container not found!");
            return;
        }
        container.innerHTML = '<p class="text-center text-gray-500 py-10 col-span-full">Loading items...</p>';

        try {
            const itemsRef = firebase.database().ref('lost_found_items'); // *** CORRECTED PATH ***
            // Use 'on' for real-time updates, order by creation time
            itemsRef.orderByChild('createdAt').on('value', snapshot => {
                allLostFoundItems = snapshot.val() || {}; // Store all items in module scope
                renderLostFoundItems(); // Initial render with 'all' filter
            }, error => {
                console.error("Error getting lost/found items:", error);
                container.innerHTML = `<p class="text-center text-red-500 py-10 col-span-full">Error loading items: ${error.message}. Check console and Firebase rules.</p>`;
            });
        } catch (error) {
             console.error("Error setting up lost/found listener:", error);
             container.innerHTML = '<p class="text-center text-red-500 py-10 col-span-full">Error initializing page.</p>';
        }
    }

    // --- Marketplace Page ---
    async function initMarketplacePage() {
        // Keep your existing initMarketplacePage logic
        // BUT ensure it calls a renderMarketplaceItems function
        const container = document.getElementById('marketplace-list'); // Assuming this ID exists
        if (!container) return;
        container.innerHTML = '<p class="text-center text-gray-500 py-10">Loading items...</p>';
         try {
            const itemsRef = firebase.database().ref('marketplace').orderByChild('createdAt');
            itemsRef.on('value', snapshot => {
                StudentModule.allMarketplaceItems = snapshot.val() || {}; // Store data
                renderMarketplaceItems(); // Call render function
            }, error => {
                console.error("Error fetching marketplace items:", error);
                 container.innerHTML = '<p class="text-center text-red-500 py-10">Could not load marketplace.</p>';
            });
        } catch(e){
            console.error("Error setting up marketplace listener:", error);
            container.innerHTML = '<p class="text-center text-red-500 py-10">Error initializing page.</p>';
        }
    }

    // --- Rendering Functions ---

    // Keep your existing renderAnnouncements function, BUT ensure it uses the NEW Tailwind HTML
    // --- Rendering Functions ---

    // Updated renderAnnouncements function
    function renderAnnouncements() {
        const container = document.getElementById('announcements-list');
        if (!container) return;
        container.innerHTML = ''; // Clear previous
        const announcements = StudentModule.allAnnouncements; // Assuming data is stored here
        const announcementIds = Object.keys(announcements);

        // Sort by timestamp descending (newest first)
        announcementIds.sort((a, b) => (announcements[b].timestamp || 0) - (announcements[a].timestamp || 0));

        if (announcementIds.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-10">No announcements found.</p>';
            return;
        }

        announcementIds.forEach(id => {
            const ann = announcements[id];
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow border border-gray-200 overflow-hidden';

            // --- MODIFIED BADGE LOGIC ---
            let priorityBadge = ''; // Initialize badge HTML as empty string
            // Only create the badge if priority is High or Medium
            if (ann.priority === 'High' || ann.priority === 'Medium') {
                let priorityClass = '';
                if (ann.priority === 'High') {
                    priorityClass = 'bg-red-100 text-red-800';
                } else { // It must be Medium if it passed the outer 'if'
                    priorityClass = 'bg-yellow-100 text-yellow-800';
                }
                // Generate the HTML for the badge
                priorityBadge = `<span class="text-xs font-medium px-3 py-1 rounded-full ${priorityClass} capitalize flex-shrink-0">${ann.priority}</span>`;
            }
            // --- END OF MODIFIED BADGE LOGIC ---

            // Use the priorityBadge variable (which is either the span HTML or an empty string)
            card.innerHTML = `
    <div class="px-5 py-4 border-b border-gray-200 bg-gray-50">
         <div class="flex justify-between items-start gap-2 flex-wrap"> <h3 class="text-lg font-semibold text-gray-900 flex-grow">${ann.title || 'No Title'}</h3> ${priorityBadge} </div>
        <p class="text-sm text-gray-500 mt-1">Published on ${new Date(ann.timestamp || Date.now()).toLocaleDateString()}</p>
    </div>
    <div class="p-5">
        <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">${ann.content || 'No Content'}</p>
    </div>`;
            container.appendChild(card);
        });
    }

    // --- Keep your other rendering functions (renderEvents, renderResources, renderLostFoundItems, etc.) ---
    // function renderEvents() { ... }
    // function renderResources() { ... }
    // function renderLostFoundItems() { ... }
    // function renderMarketplaceItems() { ... }

    // Keep your existing renderEvents function, BUT ensure it uses the NEW Tailwind HTML
    function renderEvents() {
         const container = document.getElementById('events-list');
         if (!container) return;
        container.innerHTML = '';
        const events = StudentModule.allEvents;
        const eventIds = Object.keys(events);
         eventIds.sort((a, b) => (new Date(events[a]?.date || 0)) - (new Date(events[b]?.date || 0)));

        if (eventIds.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-10">No events scheduled.</p>'; return;
        }
        eventIds.forEach(id => {
            const event = events[id];
            if (!event.date) return;
            const eventDate = new Date(event.date);
            const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
            const day = eventDate.getDate();
            const year = eventDate.getFullYear();
            const time = eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

            const card = document.createElement('div');
            card.className = 'flex flex-col sm:flex-row overflow-hidden bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow';
            card.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4 sm:p-6 bg-indigo-600 text-white sm:w-32 flex-shrink-0 text-center">
                    <span class="text-xs sm:text-sm font-medium text-indigo-200 uppercase">${month}</span>
                    <span class="text-3xl sm:text-4xl font-bold leading-none">${day}</span>
                    <span class="text-xs sm:text-sm text-indigo-200">${year}</span>
                </div>
                <div class="p-4 sm:p-6 flex flex-col justify-between flex-grow">
                    <div>
                        <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">${event.title || 'No Title'}</h3>
                        <div class="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-2 sm:mb-3">
                            <span class="flex items-center gap-1.5">
                                <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                ${time}
                            </span>
                            <span class="flex items-center gap-1.5">
                                <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                ${event.location || 'N/A'}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600 leading-relaxed line-clamp-2 sm:line-clamp-3">${event.description || 'No description provided.'}</p>
                    </div>
                </div>`;
            container.appendChild(card);
        });
    }
    

    // Add renderResources function (using NEW Tailwind HTML)
    function renderResources() {
         const container = document.getElementById('resources-list'); // Ensure ID matches your HTML
         if (!container) return;
         container.innerHTML = '';
         const resources = StudentModule.allResources;
         const resourceIds = Object.keys(resources);
         resourceIds.sort((a, b) => (resources[b].timestamp || 0) - (resources[a].timestamp || 0));

         if (resourceIds.length === 0) {
             container.innerHTML = '<p class="text-center text-gray-500 py-10">No resources available.</p>'; return;
         }
         resourceIds.forEach(id => {
             const res = resources[id];
             const item = document.createElement('div');
             // Example Card Structure (Adjust based on your resources.html design)
             item.className = 'bg-white p-4 rounded-lg shadow border border-gray-200 flex justify-between items-center';
             item.innerHTML = `
                <div>
                    <h3 class="font-semibold text-gray-900">${res.title}</h3>
                    <p class="text-sm text-gray-500">Category: ${res.category}</p>
                </div>
                <a href="${res.link}" target="_blank" rel="noopener noreferrer" class="ml-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                    View
                </a>
             `;
             container.appendChild(item);
         });
    }

    // --- NEW: Lost & Found Filter Function ---
    function filterLostFound(filterType) {
        console.log("Filtering Lost & Found by:", filterType);
        currentLostFoundFilter = filterType.toLowerCase(); // Update the stored filter
        renderLostFoundItems(); // Re-render the list based on the new filter
    }

    // --- NEW: Lost & Found Rendering Function (Uses correct fields) ---
    function renderLostFoundItems() {
        const container = document.getElementById('lost-found-list');
        if (!container) return;
        container.innerHTML = ''; // Clear previous items
        const items = allLostFoundItems; // Use module-scoped variable
        const filter = currentLostFoundFilter; // Get the currently set filter
        let hasVisibleItems = false;

        const itemIds = Object.keys(items);
        itemIds.sort((a, b) => (items[b].createdAt || 0) - (items[a].createdAt || 0)); // Sort newest first

        itemIds.forEach(id => {
            const item = items[id];
            const itemStatus = item.status ? item.status.toLowerCase() : 'unknown';

            const matchesFilter = (filter === 'all') || (itemStatus === filter);

            if (matchesFilter) {
                hasVisibleItems = true;
                const card = document.createElement('div');
                card.className = 'bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow';

                let statusBadgeClass = 'bg-gray-100 text-gray-800';
                if (itemStatus === 'lost') statusBadgeClass = 'bg-red-100 text-red-800';
                else if (itemStatus === 'found') statusBadgeClass = 'bg-green-100 text-green-800';
                else if (itemStatus === 'resolved') statusBadgeClass = 'bg-gray-100 text-gray-600'; // Specific gray for resolved

                card.innerHTML = `
                    <img class="h-48 w-full object-cover"
                         src="${item.imageUrl || 'https://placehold.co/400x300/e5e7eb/6b7280?text=No+Image'}"
                         alt="${item.name || 'Item Image'}">
                    <div class="p-4 sm:p-5 flex flex-col flex-grow">
                        <div class="flex justify-between items-start mb-2 gap-2">
                            <h3 class="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2 flex-grow" title="${item.name || ''}">${item.name || 'No Name'}</h3>
                            <span class="text-xs font-medium px-2.5 py-0.5 rounded-full ${statusBadgeClass} capitalize flex-shrink-0">${itemStatus}</span>
                        </div>
                        <div class="text-xs sm:text-sm text-gray-500 space-y-1 mb-3">
                            <p><span class="font-medium text-gray-700">Location:</span> ${item.location || 'N/A'}</p>
                            <p><span class="font-medium text-gray-700">Date Reported:</span> ${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</p>
                            <p><span class="font-medium text-gray-700">Reported By:</span> ${item.reporterName || 'N/A'}</p>
                        </div>
                        <p class="text-sm text-gray-600 leading-relaxed flex-grow line-clamp-3">
                            ${item.description || 'No description provided.'}
                        </p>
                    </div>
                `;
                container.appendChild(card);
            }
        });

        if (!hasVisibleItems) {
            container.innerHTML = `<p class="text-center text-gray-500 py-10 col-span-full">No items found matching "${filter}".</p>`;
        }
    }
    /**
 * student.js
 * * Main module for all student-facing page logic, including
 * Dashboard, Announcements, Events, Resources, and Lost & Found.
 */

const StudentModule = {

    // --- Global Properties ---
    currentUserId: null,

    // --- Dashboard Properties ---
    // (Add any dashboard-specific properties here)

    // --- Events Properties ---
    allEvents: {},
    myRSVPs: {},
    currentEventFilter: 'all',

    // --- Resources Properties ---
    // (Add any resources-specific properties here)

    // --- Lost & Found Properties ---
    allLostFoundItems: {},
    currentLostFoundFilter: 'all',

    
    // --- =========================== ---
    // --- PAGE INITIALIZERS
    // --- =========================== ---

    /**
     * Initializes the Dashboard page.
     * (Logic should be moved here from dashboard.html)
     */
    initDashboardPage: function() {
        console.log("Dashboard page initialized.");
        // Note: Your dashboard.html file has its own 'DashboardModule'.
        // For consistency, that logic should also be moved here.
        // For now, we'll leave it as-is to avoid breaking it.
    },

    /**
     * Initializes the Announcements page.
     * (Logic is in announcements.html)
     */
    initAnnouncementsPage: function() {
        console.log("Announcements page initialized.");
        // The logic is currently inside announcements.html's <script> tag.
        // This is fine for now.
    },

    /**
     * Initializes the Events page with RSVP and filter logic.
     */
    initEventsPage: function(user) {
        this.currentUserId = user.uid;
        const eventsRef = firebase.database().ref('events');
        const rsvpRef = firebase.database().ref(`event_rsvps_by_user/${user.uid}`);
        const listContainer = document.getElementById('events-list');

        if (!listContainer) {
            console.error("Events list container not found.");
            return;
        }

        // Add click listener for filter tabs
        document.getElementById('event-filter-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.filter-tab');
            if (!tab) return;
            this.currentEventFilter = tab.dataset.filter;
            // Update active tab styles
            document.querySelectorAll('.filter-tab').forEach(t => {
                t.classList.remove('active', 'text-indigo-600', 'border-indigo-500');
                t.classList.add('text-gray-500', 'hover:text-gray-700', 'border-transparent');
            });
            tab.classList.add('active', 'text-indigo-600', 'border-indigo-500');
            tab.classList.remove('text-gray-500', 'hover:text-gray-700', 'border-transparent');
            
            this.renderEvents();
        });

        // Add click listener for RSVP buttons (event delegation)
        listContainer.addEventListener('click', (e) => {
            const rsvpBtn = e.target.closest('.rsvp-btn');
            if (rsvpBtn && !rsvpBtn.disabled) {
                const eventId = rsvpBtn.dataset.eventId;
                const isRSVPd = this.myRSVPs[eventId];
                this.handleRsvpClick(eventId, !isRSVPd);
            }
        });

        // Listen for changes in events and RSVPs
        eventsRef.on('value', (snapshot) => {
            this.allEvents = snapshot.val() || {};
            this.renderEvents();
        }, this.handleEventError);

        rsvpRef.on('value', (snapshot) => {
            this.myRSVPs = snapshot.val() || {};
            this.renderEvents();
        }, this.handleEventError);
    },

    /**
     * Initializes the Resources page.
     * (Logic is in resources.html)
     */
    initResourcesPage: function() {
        console.log("Resources page initialized.");
        // The logic is currently inside resources.html's <script> tag.
        // This is fine for now.
    },

    /**
     * Initializes the Lost & Found page with filter logic.
     */
    initLostFoundPage: function() {
        this.currentUserId = window.StudentModule.currentUserId; // Set by auth listener
        
        return new Promise((resolve, reject) => {
            const ref = firebase.database().ref('lost_found_items');
            ref.on('value', (snapshot) => {
                this.allLostFoundItems = snapshot.val() || {};
                this.renderLostFoundItems(); // Initial render
                resolve();
            }, (error) => {
                console.error("Error fetching lost & found items:", error);
                document.getElementById('lost-found-list').innerHTML = '<p class="text-center text-red-500 py-10 col-span-full">Error loading items.</p>';
                reject(error);
            });
        });
    },

    // --- =========================== ---
    // --- EVENT HELPER FUNCTIONS
    // --- =========================== ---

    formatEventDateTime: function(isoStart, isoEnd) {
        try {
            const start = new Date(isoStart);
            const end = isoEnd ? new Date(isoEnd) : null;
            
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            const timeOptions = { hour: 'numeric', minute: '2-digit' };

            if (!end || start.toDateString() === end.toDateString()) {
                // Same day
                const endTime = end ? end.toLocaleTimeString([], timeOptions) : 'N/A';
                return `${start.toLocaleDateString([], options)} from ${start.toLocaleTimeString([], timeOptions)} to ${endTime}`;
            } else {
                // Multi-day
                return `From ${start.toLocaleString([], {...options, ...timeOptions})} to ${end.toLocaleString([], {...options, ...timeOptions})}`;
            }
        } catch (e) {
            return "Invalid Date";
        }
    },

    renderEvents: function() {
        const listContainer = document.getElementById('events-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        const now = new Date();

        let eventKeys = Object.keys(this.allEvents);
        
        const filteredEvents = eventKeys.map(key => ({ id: key, ...this.allEvents[key] }))
            .filter(event => {
                if (!event.date) return false; 
                
                const eventStart = new Date(event.date);
                const eventEnd = event.endDate ? new Date(event.endDate) : new Date(eventStart.getTime() + 3600000); 
                const isRSVPd = this.myRSVPs[event.id];

                let isPast = now > eventEnd;
                let isOngoing = now >= eventStart && now <= eventEnd;

                switch (this.currentEventFilter) {
                    case 'upcoming': return !isPast; // Shows 'Upcoming' + 'Ongoing'
                    case 'past': return isPast;
                    case 'my_rsvps': return isRSVPd;
                    case 'all':
                    default:
                        return true;
                }
            });

        filteredEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filteredEvents.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-gray-500 py-10">No events found for this filter.</p>';
            return;
        }

        filteredEvents.forEach(event => {
            const eventStart = new Date(event.date);
            const eventEnd = event.endDate ? new Date(event.endDate) : new Date(eventStart.getTime() + 3600000);
            
            let statusLabel = '';
            let cardClass = ''; 
            let dateBoxClass = 'bg-indigo-600 text-white'; // Upcoming default
            
            if (now < eventStart) {
                statusLabel = 'Upcoming';
            } else if (now >= eventStart && now <= eventEnd) {
                statusLabel = 'Ongoing';
                cardClass = 'event-card-ongoing'; 
                dateBoxClass = 'bg-blue-100 text-blue-700'; 
            } else {
                statusLabel = 'Past';
                cardClass = 'opacity-70'; 
                dateBoxClass = 'bg-gray-200 text-gray-600'; 
            }
            const isPast = (statusLabel === 'Past');
            const isRSVPd = this.myRSVPs[event.id];

            const month = eventStart.toLocaleString('default', { month: 'short' }).toUpperCase();
            const day = eventStart.getDate();
            
            const formattedDateTime = this.formatEventDateTime(event.date, event.endDate);

            let rsvpButtonHTML = '';
            const baseButtonClasses = "rsvp-btn w-full sm:w-auto inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition-colors";
            
            if (isPast) {
                rsvpButtonHTML = `<button class="${baseButtonClasses} bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed" disabled>Event Ended</button>`;
            } else if (isRSVPd) {
                rsvpButtonHTML = `<button class="${baseButtonClasses} bg-white border-green-600 text-green-600 hover:bg-green-50" data-event-id="${event.id}">✔ RSVP'd (Click to Un-RSVP)</button>`;
            } else {
                rsvpButtonHTML = `<button class="${baseButtonClasses} bg-white border-indigo-600 text-indigo-600 hover:bg-indigo-50" data-event-id="${event.id}">RSVP Now</button>`;
            }

            const card = document.createElement('div');
            card.className = `bg-white rounded-lg shadow border border-gray-200 overflow-hidden ${cardClass}`;
            card.innerHTML = `
                <div class="flex flex-col sm:flex-row">
                    <div class="date-box flex-shrink-0 flex flex-col items-center justify-center h-24 sm:h-auto sm:w-24 rounded-t-lg sm:rounded-l-lg sm:rounded-t-none ${dateBoxClass} p-4 text-center">
                        <span class="text-lg font-bold uppercase">${month}</span>
                        <span class="text-4xl font-extrabold leading-none">${day}</span>
                    </div>
                    <div class="flex-grow p-4 sm:p-5">
                        <div class="flex justify-between items-start">
                            <h3 class="text-xl font-semibold text-gray-900">${event.title}</h3>
                            ${statusLabel === 'Ongoing' ? '<span class="flex items-center text-sm font-medium text-blue-600 font-semibold">Ongoing</span>' : ''}
                        </div>
                        <p class="text-sm font-medium text-gray-500">${formattedDateTime}</p>
                        <p class="mt-1 text-sm text-gray-700">@ ${event.location}</p>
                        <p class="mt-3 text-sm text-gray-600">${event.description || ''}</p>
                        <div class="mt-4 text-left sm:text-right">
                            ${rsvpButtonHTML}
                        </div>
                    </div>
                </div>
            `;
            listContainer.appendChild(card);
        });
    },

    handleRsvpClick: function(eventId, shouldRsvp) {
        const userId = this.currentUserId;
        const rsvpUserRef = firebase.database().ref(`event_rsvps_by_user/${userId}/${eventId}`);
        const rsvpEventRef = firebase.database().ref(`event_rsvps_by_event/${eventId}/${userId}`);
        
        const updates = {};
        
        if (shouldRsvp) {
            updates[`event_rsvps_by_user/${userId}/${eventId}`] = true;
            updates[`event_rsvps_by_event/${eventId}/${userId}`] = true;
        } else {
            updates[`event_rsvps_by_user/${userId}/${eventId}`] = null;
            updates[`event_rsvps_by_event/${eventId}/${userId}`] = null;
        }

        firebase.database().ref().update(updates)
            .then(() => { console.log(`RSVP status updated for event ${eventId}`); })
            .catch(this.handleEventError);
    },

    handleEventError: function(error) {
        console.error("Firebase Events Error:", error);
        document.getElementById('events-list').innerHTML = '<p class="text-center text-red-500 py-10">An error occurred while loading events.</p>';
    },

    // --- =========================== ---
    // --- LOST & FOUND HELPER FUNCTIONS
    // --- =========================== ---

    /**
     * Called when a Lost & Found filter tab is clicked.
     */
    filterLostFound: function(newFilter) {
        this.currentLostFoundFilter = newFilter;
        this.renderLostFoundItems(); // Re-render the list
    },

    /**
     * Renders the list of Lost & Found items based on the current filter.
     */
    renderLostFoundItems: function() {
        const container = document.getElementById('lost-found-list');
        if (!container) return;
        container.innerHTML = '';

        const itemKeys = Object.keys(this.allLostFoundItems);
        
        const filteredKeys = itemKeys.filter(key => {
            const item = this.allLostFoundItems[key];
            if (!item || !item.status) return false;
            const itemStatus = item.status.toLowerCase();
            
            switch (this.currentLostFoundFilter) {
                case 'lost':
                    return itemStatus === 'lost';
                case 'found':
                    return itemStatus === 'found';
                case 'resolved':
                    return itemStatus === 'resolved';
                case 'my_posts':
                    return item.reporterId === this.currentUserId;
                case 'all':
                default:
                    return true;
            }
        });

        // Sort by newest first
        filteredKeys.sort((a, b) => (this.allLostFoundItems[b].createdAt || 0) - (this.allLostFoundItems[a].createdAt || 0));

        if (filteredKeys.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-10 col-span-full">No items found for this filter.</p>';
            return;
        }

        filteredKeys.forEach(key => {
            const item = this.allLostFoundItems[key];
            if (this.createLostFoundCard) {
                const card = this.createLostFoundCard(key, item);
                container.appendChild(card);
            } else {
                console.error("StudentModule.createLostFoundCard is not defined!");
            }
        });
    },

    /**
     * Creates the HTML for a single Lost & Found card.
     */
    createLostFoundCard: function(key, item) {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-lg shadow border border-gray-200 overflow-hidden';
        
        let statusClass = 'bg-gray-100 text-gray-800'; // Resolved/default
        if (item.status === 'Lost') statusClass = 'bg-red-100 text-red-800';
        if (item.status === 'Found') statusClass = 'bg-green-100 text-green-800';
        
        // Use base64Image first, then fall back to the placeholder
        const imageSource = item.base64Image || 'https://placehold.co/400x300/e5e7eb/6b7280?text=No+Image';
        const date = new Date(item.createdAt || Date.now()).toLocaleDateString();

        div.innerHTML = `
            <div class="h-48 bg-gray-200">
                <img src="${imageSource}" alt="${item.name}" class="h-full w-full object-cover" onerror="this.onerror=null; this.src='https://placehold.co/400x300/e5e7eb/6b7280?text=Error';">
            </div>
            <div class="p-5">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${statusClass}">
                        ${item.status}
                    </span>
                    <span class="text-xs text-gray-400">${date}</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-1 truncate" title="${item.name}">${item.name}</h3>
                <p class="text-sm text-gray-600 mb-2">
                    <span class="font-medium">${item.status === 'Lost' ? 'Last Seen:' : 'Found At:'}</span>
                    <span class="truncate" title="${item.location}">${item.location || 'N/A'}</span>
                </p>
                <p class="text-sm text-gray-500 line-clamp-2">${item.description || 'No description provided.'}</p>
                <p class="text-xs text-gray-400 mt-3">Reported by: ${item.reporterName || 'N/A'}</p>
            </div>
        `;
        return div;
    }
}

    // Add renderMarketplaceItems function (using NEW Tailwind HTML)
    function renderMarketplaceItems() {
         const container = document.getElementById('marketplace-list'); // Ensure ID matches your HTML
         if (!container) return;
         container.innerHTML = '';
         const items = StudentModule.allMarketplaceItems; // Assuming items are stored here
         const itemIds = Object.keys(items);
         itemIds.sort((a, b) => (items[b].createdAt || 0) - (items[a].createdAt || 0));

         if (itemIds.length === 0) {
             container.innerHTML = '<p class="text-center text-gray-500 py-10">Marketplace is empty.</p>'; return;
         }

         itemIds.forEach(id => {
             const item = items[id];
             const card = document.createElement('div');
             // Example Card Structure (Adjust based on your marketplace.html design)
             card.className = 'bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col';
             card.innerHTML = `
                <img class="h-48 w-full object-cover" src="${item.imageUrl || 'https://placehold.co/400x300/e5e7eb/6b7280?text=No+Image'}" alt="${item.name}">
                <div class="p-4 flex flex-col flex-grow">
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="font-semibold text-gray-900 truncate pr-2">${item.name}</h3>
                        <p class="text-lg font-bold text-indigo-600 flex-shrink-0">$${item.price.toFixed(2)}</p>
                    </div>
                    <p class="text-sm text-gray-600 line-clamp-2 flex-grow mb-3">${item.description}</p>
                    <div class="text-xs text-gray-500">
                        <span>Sold by: ${item.sellerName || 'N/A'}</span>
                        <span class="float-right">Qty: ${item.quantity}</span>
                    </div>
                     <button class="mt-3 w-full inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                        View Details
                    </button> </div>
             `;
             container.appendChild(card);
         });
    }

    // --- Modal Functions ---
    // Keep your existing placeholder modal functions
    function reportLostItem() {
        // This should now call the showReportModal('Lost') function from lost-found.html's inline script
        if (typeof showReportModal === 'function') {
             showReportModal('Lost');
        } else {
             alert("Report Lost Item functionality not available.");
             console.error("showReportModal function not found.");
        }
    }
    function sellItem() {
         // You'll need a similar modal system for marketplace item creation
        alert("Sell an Item functionality not yet implemented.");
    }

    // Public API - Ensure all needed functions are exposed
    return {
        initDashboard,
        loadRecentAnnouncements,
        loadUpcomingEvents,
        loadRecentResources,
        rsvpEvent,
        loadAllAnnouncements,
        loadAllEvents,
        initAnnouncementsPage,
        initEventsPage,
        initProfilePage,
        initResourcesPage,
        initLostFoundPage,
        initMarketplacePage,
        reportLostItem, // Keep if called from elsewhere, otherwise can be removed if only modals are used
        sellItem,       // Keep if called from elsewhere, otherwise can be removed if only modals are used
        // --- ADDED ---
        filterLostFound,
        renderLostFoundItems, // Expose if needed externally, otherwise can be private
        renderAnnouncements, // Expose if needed externally
        renderEvents, // Expose if needed externally
        renderResources, // Expose if needed externally
        renderMarketplaceItems // Expose if needed externally
    };
})();

// Helper function assumed to be in UIModule (or add it here if not)
// window.UIModule = window.UIModule || {}; // Ensure UIModule exists
// window.UIModule.truncateText = (text, maxLength) => {
//    if (!text) return '';
//    if (text.length <= maxLength) return text;
//    return text.substring(0, maxLength) + '...';
// };
// window.UIModule.formatRelativeTime = (timestamp) => { /* implementation */ };
// window.UIModule.formatDate = (isoString) => { /* implementation */ };