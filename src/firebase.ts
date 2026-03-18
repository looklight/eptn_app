// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvYtzO4YJq2aCYqdYfqi0yuA7EbGTkbOk",
  authDomain: "eptn-app.firebaseapp.com",
  projectId: "eptn-app",
  storageBucket: "eptn-app.firebasestorage.app",
  messagingSenderId: "85669252737",
  appId: "1:85669252737:web:39e5ef244c89a36a2a0780"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Esporta Firestore
export const db = getFirestore(app);