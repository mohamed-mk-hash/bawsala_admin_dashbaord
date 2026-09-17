// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';


const firebaseConfig = {
  apiKey: "AIzaSyDeSS-KmizkZ97n9OvykgEnjv7AH-y_HYQ",
  authDomain: "bawsala-e625d.firebaseapp.com",
  projectId: "bawsala-e625d",
  storageBucket: "bawsala-e625d.firebasestorage.app",
  messagingSenderId: "437642394397",
  appId: "1:437642394397:web:694efcf8a95d47de65bff4",
  measurementId: "G-7XCSJ7H7CX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

export default app;