// Authentication Module
window.AuthModule = (function() {
    const { auth, googleProvider } = window.FirebaseConfig;
    
    // Fixed admin credentials
    const ADMIN_EMAIL = 'admin@campus.edu';
    async function updateAuthProfile(profileData) {
    const user = auth.currentUser;
    if (user) {
        try {
            await user.updateProfile(profileData);
        } catch (error) {
            console.error("Error updating auth profile:", error);
            throw new Error("Could not update profile.");
        }
    }
}
    
    // Create account with email and password
    async function createAccount(email, password) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            console.log('Account created successfully:', userCredential.user.uid);
            return userCredential;
        } catch (error) {
            console.error('Error creating account:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    }
    
    // Sign in with email and password
    async function signInWithEmail(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('Signed in successfully:', userCredential.user.uid);
            return userCredential;
        } catch (error) {
            console.error('Error signing in:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    }
    
    // Sign in with Google
    async function signInWithGoogle() {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            console.log('Google sign in successful:', result.user.uid);
            return result;
        } catch (error) {
            console.error('Error with Google sign in:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    }
    async function updateAuthProfile(profileData) {
        const user = auth.currentUser;
        if (user) {
            try {
                await user.updateProfile(profileData);
            } catch (error) {
                console.error("Error updating auth profile:", error);
                throw new Error("Could not update profile.");
            }
        }
    }
    
    // Sign out
    async function signOut() {
        try {
            await auth.signOut();
            console.log('Signed out successfully');
            window.location.href = '/';
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }
    // Add this new function to the file
    async function sendPasswordReset(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            console.log('Password reset email sent successfully.');
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw new Error(getAuthErrorMessage(error.code));
        }
    }
    
    // Check if user is admin
    function isAdmin(email) {
        return email === ADMIN_EMAIL;
    }
    
    // Get user role
    async function getUserRole(uid) {
        try {
            const user = auth.currentUser;
            if (!user) return null;
            
            // Check if admin by email
            if (isAdmin(user.email)) {
                return 'admin';
            }
            
            // Get role from database
            const userRef = window.FirebaseConfig.database.ref(`users/${uid}`);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val();
            
            return userData?.role || 'student';
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'student';
        }
    }
    
    // Get current user
    function getCurrentUser() {
        return auth.currentUser;
    }
    
    // Auth state observer
    function onAuthStateChanged(callback) {
        return auth.onAuthStateChanged(callback);
    }
    
    // Redirect based on role
    async function redirectToDashboard(user) {
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        
        const role = await getUserRole(user.uid);
        if (role === 'admin') {
            window.location.href = '/admin/dashboard.html';
        } else {
            window.location.href = '/student/dashboard.html';
        }
    }
    
    // Auth error messages
    function getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters long.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/popup-closed-by-user': 'Sign in was cancelled.',
            'auth/cancelled-popup-request': 'Sign in was cancelled.',
        };
        
        return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
    }
    
    // Public API
    return {
        createAccount,
        signInWithEmail,
        signInWithGoogle,
        signOut,
        sendPasswordReset,
        isAdmin,
        updateAuthProfile,
        getUserRole,
        getCurrentUser,
        updateAuthProfile,
        onAuthStateChanged,
        redirectToDashboard,
        ADMIN_EMAIL
    };
})();