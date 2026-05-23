// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDyB0PkModKyIj8p_yS1z_Mw1FHwHYi7uI",
    authDomain: "gracemissionchruch.firebaseapp.com",
    databaseURL: "https://gracemissionchruch-default-rtdb.firebaseio.com",
    projectId: "gracemissionchruch",
    storageBucket: "gracemissionchruch.firebasestorage.app",
    messagingSenderId: "960042031781",
    appId: "1:960042031781:web:44c1097d4384926e1a0b4c",
    measurementId: "G-SCPKJW9RQL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Note: Using Firestore-only authentication (no Firebase Auth enabled)