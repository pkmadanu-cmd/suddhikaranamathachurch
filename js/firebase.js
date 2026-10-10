// firebase.js

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAhJhL5B-K6rLkt1RY3f4mAh4AYfTjlciY",
    authDomain: "shuddhikarana-church-office.firebaseapp.com",
    projectId: "shuddhikarana-church-office",
    storageBucket: "shuddhikarana-church-office.firebasestorage.app",
    messagingSenderId: "103725977602",
    appId: "1:103725977602:web:709370dd73dd240766971b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);