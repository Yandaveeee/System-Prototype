// Database Module
window.DatabaseModule = (function() {
    const { database } = window.FirebaseConfig;
    
    // Create user profile
    async function createUserProfile(uid, userData) {
        try {
            const userRef = database.ref(`users/${uid}`);
            await userRef.set({
                ...userData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            console.log('User profile created successfully');
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    }
    
    // Get user profile
    async function getUserProfile(uid) {
        try {
            const userRef = database.ref(`users/${uid}`);
            const snapshot = await userRef.once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    }
    
    // Update user profile
    async function updateUserProfile(uid, updates) {
        try {
            const userRef = database.ref(`users/${uid}`);
            await userRef.update({
                ...updates,
                updatedAt: new Date().toISOString()
            });
            console.log('User profile updated successfully');
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }
    
    // ANNOUNCEMENTS
    async function createAnnouncement(data) {
        try {
            const announcementsRef = database.ref('announcements');
            const newAnnouncementRef = announcementsRef.push();
            await newAnnouncementRef.set({
                ...data,
                id: newAnnouncementRef.key,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return newAnnouncementRef.key;
        } catch (error) {
            console.error('Error creating announcement:', error);
            throw error;
        }
    }
    
    async function getAnnouncements(limit = 50) {
        try {
            const announcementsRef = database.ref('announcements')
                .orderByChild('createdAt')
                .limitToLast(limit);
            const snapshot = await announcementsRef.once('value');
            const announcements = [];
            snapshot.forEach(child => {
                announcements.unshift(child.val());
            });
            return announcements;
        } catch (error) {
            console.error('Error getting announcements:', error);
            throw error;
        }
    }

    // highlight-start
    // NEW - Gets a single announcement for the edit feature
    async function getAnnouncementById(id) {
        try {
            const announcementRef = database.ref(`announcements/${id}`);
            const snapshot = await announcementRef.once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting announcement by ID:', error);
            throw error;
        }
    }
    // highlight-end
    
    async function updateAnnouncement(id, updates) {
        try {
            const announcementRef = database.ref(`announcements/${id}`);
            await announcementRef.update({
                ...updates,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating announcement:', error);
            throw error;
        }
    }
    
    async function deleteAnnouncement(id) {
        try {
            const announcementRef = database.ref(`announcements/${id}`);
            await announcementRef.remove();
        } catch (error) {
            console.error('Error deleting announcement:', error);
            throw error;
        }
    }
    
    // EVENTS
    async function createEvent(data) {
        try {
            const eventsRef = database.ref('events');
            const newEventRef = eventsRef.push();
            await newEventRef.set({
                ...data,
                id: newEventRef.key,
                attendees: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return newEventRef.key;
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    }
    
    async function getEvents(limit = 50) {
        try {
            const eventsRef = database.ref('events')
                .orderByChild('date')
                .limitToFirst(limit);
            const snapshot = await eventsRef.once('value');
            const events = [];
            snapshot.forEach(child => {
                events.push(child.val());
            });
            return events;
        } catch (error) {
            console.error('Error getting events:', error);
            throw error;
        }
    }
    
    async function rsvpEvent(eventId, userId, userData) {
        try {
            const attendeeRef = database.ref(`events/${eventId}/attendees/${userId}`);
            await attendeeRef.set({
                ...userData,
                rsvpAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error RSVP to event:', error);
            throw error;
        }
    }
    
    // RESOURCES
    async function createResource(data) {
        try {
            const resourcesRef = database.ref('resources');
            const newResourceRef = resourcesRef.push();
            await newResourceRef.set({
                ...data,
                id: newResourceRef.key,
                downloads: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return newResourceRef.key;
        } catch (error) {
            console.error('Error creating resource:', error);
            throw error;
        }
    }
    
    async function getResources(category = null, limit = 50) {
        try {
            let resourcesRef = database.ref('resources');
            
            if (category) {
                resourcesRef = resourcesRef.orderByChild('category').equalTo(category);
            } else {
                resourcesRef = resourcesRef.orderByChild('createdAt').limitToLast(limit);
            }
            
            const snapshot = await resourcesRef.once('value');
            const resources = [];
            snapshot.forEach(child => {
                resources.unshift(child.val());
            });
            return resources;
        } catch (error) {
            console.error('Error getting resources:', error);
            throw error;
        }
    }
    
    // LOST & FOUND
    async function createLostFoundItem(data) {
        try {
            const lostFoundRef = database.ref('lostFound');
            const newItemRef = lostFoundRef.push();
            await newItemRef.set({
                ...data,
                id: newItemRef.key,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return newItemRef.key;
        } catch (error) {
            console.error('Error creating lost/found item:', error);
            throw error;
        }
    }
    
    async function getLostFoundItems(type = null, limit = 50) {
        try {
            let itemsRef = database.ref('lostFound');
            
            if (type) {
                itemsRef = itemsRef.orderByChild('type').equalTo(type);
            } else {
                itemsRef = itemsRef.orderByChild('createdAt').limitToLast(limit);
            }
            
            const snapshot = await itemsRef.once('value');
            const items = [];
            snapshot.forEach(child => {
                items.unshift(child.val());
            });
            return items;
        } catch (error) {
            console.error('Error getting lost/found items:', error);
            throw error;
        }
    }
    async function deleteEvent(id) {
    try { await database.ref(`events/${id}`).remove(); }
    catch (error) { console.error('Error deleting event:', error); throw error; }
}
async function deleteResource(id) {
    try { await database.ref(`resources/${id}`).remove(); }
    catch (error) { console.error('Error deleting resource:', error); throw error; }
}
async function deleteLostFoundItem(id) {
    try { await database.ref(`lostFound/${id}`).remove(); }
    catch (error) { console.error('Error deleting item:', error); throw error; }
}
async function deleteMarketplaceItem(id) {
    try { await database.ref(`marketplace/${id}`).remove(); }
    catch (error) { console.error('Error deleting item:', error); throw error; }
}
    
    // MARKETPLACE
    async function createMarketplaceItem(data) {
        try {
            const marketplaceRef = database.ref('marketplace');
            const newItemRef = marketplaceRef.push();
            await newItemRef.set({
                ...data,
                id: newItemRef.key,
                status: 'available',
                views: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return newItemRef.key;
        } catch (error) {
            console.error('Error creating marketplace item:', error);
            throw error;
        }
    }
    
    async function getMarketplaceItems(category = null, limit = 50) {
        try {
            let itemsRef = database.ref('marketplace');
            
            if (category) {
                itemsRef = itemsRef.orderByChild('category').equalTo(category);
            } else {
                itemsRef = itemsRef.orderByChild('createdAt').limitToLast(limit);
            }
            
            const snapshot = await itemsRef.once('value');
            const items = [];
            snapshot.forEach(child => {
                if (child.val().status === 'available') {
                    items.unshift(child.val());
                }
            });
            return items;
        } catch (error) {
            console.error('Error getting marketplace items:', error);
            throw error;
        }
    }
    async function push(path, data) { // Make sure the name is 'push'
        try {
            const dbRef = firebase.database().ref(path);
            const newRef = await dbRef.push(data);
            return newRef.key; // Return the new item's key
        } catch (error) {
            console.error(`Error pushing data to ${path}:`, error);
            throw error; // Re-throw the error to be caught by the caller
        }
    }
    
    // STATISTICS (for admin dashboard)
    async function getStats() {
        try {
            const [
                usersSnapshot,
                announcementsSnapshot,
                eventsSnapshot,
                resourcesSnapshot,
                lostFoundSnapshot,
                marketplaceSnapshot
            ] = await Promise.all([
                database.ref('users').once('value'),
                database.ref('announcements').once('value'),
                database.ref('events').once('value'),
                database.ref('resources').once('value'),
                database.ref('lostFound').once('value'),
                database.ref('marketplace').once('value')
            ]);
            
            return {
                users: usersSnapshot.numChildren(),
                announcements: announcementsSnapshot.numChildren(),
                events: eventsSnapshot.numChildren(),
                resources: resourcesSnapshot.numChildren(),
                lostFound: lostFoundSnapshot.numChildren(),
                marketplace: marketplaceSnapshot.numChildren()
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }
    
    // Real-time listeners
    function onAnnouncementsChange(callback) {
        const announcementsRef = database.ref('announcements')
            .orderByChild('createdAt')
            .limitToLast(10);
        return announcementsRef.on('value', callback);
    }
    
    function onEventsChange(callback) {
        const eventsRef = database.ref('events')
            .orderByChild('date')
            .limitToFirst(10);
        return eventsRef.on('value', callback);
    }

    function onUsersCountChange(callback) {
        const usersRef = database.ref('users');
        usersRef.on('value', (snapshot) => {
            const count = snapshot.numChildren();
            callback(count);
        });
    }
    
    function removeListener(ref, eventType, callback) {
        ref.off(eventType, callback);
    }
    
    // Public API
    return {
        // User management
        createUserProfile,
        getUserProfile,
        updateUserProfile,
        
        // Announcements
        createAnnouncement,
        getAnnouncements,
        getAnnouncementById, // highlight-line
        updateAnnouncement,
        deleteAnnouncement,
        
        // Events
        createEvent,
        getEvents,
        rsvpEvent,
        deleteEvent,
        
        // Resources
        createResource,
        getResources,
        deleteResource,
        
        // Lost & Found
        createLostFoundItem,
        getLostFoundItems,
        deleteLostFoundItem,
        
        // Marketplace
        createMarketplaceItem,
        getMarketplaceItems,
        deleteMarketplaceItem,
        
        // Statistics
        getStats,
        
        // Real-time listeners
        onAnnouncementsChange,
        onEventsChange,
        onUsersCountChange,
        push,
        removeListener
    };
})();