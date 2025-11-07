// js/config/firebase.js

// Firebase Configuration
// Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCGB2MI_e7K8OOyog7GK3pz31OA_ZBgJ8k",
    authDomain: "study-8b66a.firebaseapp.com",
    // highlight-next-line
    databaseURL: "https://study-8b66a-default-rtdb.asia-southeast1.firebasedatabase.app", // This line is crucial
    projectId: "study-8b66a",
    storageBucket: "study-8b66a.appspot.com",
    messagingSenderId: "252302248015",
    appId: "1:252302248015:web:5d1d3fb543ca91f41e023a",
    measurementId: "G-6VQFTH7CFB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const database = firebase.database();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Export for use in other modules
window.FirebaseConfig = {
    auth,
    database,
    googleProvider
};

console.log('Firebase initialized successfully');