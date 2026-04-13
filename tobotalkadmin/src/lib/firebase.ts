import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// User provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgLVBYYOh5AnFvad9ge1Z7TPnoVDTKLoM",
  authDomain: "tobotalk-68541.firebaseapp.com",
  projectId: "tobotalk-68541",
  storageBucket: "tobotalk-68541.firebasestorage.app",
  messagingSenderId: "642130159508",
  appId: "1:642130159508:web:6e9d473ecbd47e46069181",
  measurementId: "G-GK6SKJVFNL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Using the default database as specified by the user
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
