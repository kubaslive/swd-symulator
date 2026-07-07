const { initializeApp } = require('firebase/app');
const { getFirestore, getDocs, collection } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCOPwZRXDvBaT6ZIW17OdPeLiMcgq0kEtk",
  authDomain: "swd-auth-roles-5a7b.firebaseapp.com",
  projectId: "swd-auth-roles-5a7b",
  storageBucket: "swd-auth-roles-5a7b.firebasestorage.app",
  messagingSenderId: "289043215984",
  appId: "1:289043215984:web:52539e29dfcff7a9bde6b5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const users = await getDocs(collection(db, 'users'));
  users.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}
run();
