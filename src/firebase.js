import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCOPwZRXDvBaT6ZIW17OdPeLiMcgq0kEtk",
  authDomain: "swd-auth-roles-5a7b.firebaseapp.com",
  projectId: "swd-auth-roles-5a7b",
  storageBucket: "swd-auth-roles-5a7b.firebasestorage.app",
  messagingSenderId: "289043215984",
  appId: "1:289043215984:web:52539e29dfcff7a9bde6b5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
