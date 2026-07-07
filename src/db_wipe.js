import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase.js'; // Assuming this is where db is exported

export const wipeAndInitializeDb = async (uid) => {
  const collectionsToWipe = ['tenants', 'incidents', 'messages', 'calls'];
  for (const colName of collectionsToWipe) {
    const colRef = collection(db, colName);
    const snapshot = await getDocs(colRef);
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, colName, d.id)));
    await Promise.all(deletePromises);
    console.log(`Wiped ${colName}`);
  }

  // Set up the user as WSKR and assigned to KM PSP Katowice
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid: uid,
    role: 'admin',
    tenantId: '120100',
    email: 'kubasgraf@gmail.com', // Or dynamically fetched
    displayName: 'WSKR Śląsk'
  }, { merge: true });

  // Initialize the tenants (Komendy)
  const tenants = [
    { id: '120000', name: 'KW PSP Katowice', jrgUnits: [], ospUnits: [] },
    { id: '120100', name: 'KM PSP Katowice', jrgUnits: ['JRG nr 1 Katowice', 'JRG nr 2 Katowice', 'JRG nr 3 Katowice'], ospUnits: ['OSP Katowice-Szopienice', 'OSP Katowice-Dąbrówka Mała', 'OSP Katowice-Podlesie', 'OSP Katowice-Zarzecze', 'OSP Katowice-Kostuchna'] },
    { id: '120200', name: 'KP PSP Będzin', jrgUnits: ['JRG nr 1 Będzin', 'PJRG Siewierz'], ospUnits: ['OSP Czeladź', 'OSP Grodziec w Będzinie', 'OSP Łagisza w Będzinie'] },
    { id: 'KM_Zabrze', name: 'KM PSP Zabrze', jrgUnits: ['JRG nr 1 Zabrze'], ospUnits: [] },
    { id: 'KM_Myslowice', name: 'KM PSP Mysłowice', jrgUnits: ['JRG nr 1 Mysłowice'], ospUnits: ['ZSP Mysłowice-Wesoła'] }
  ];

  for (const tenant of tenants) {
    await setDoc(doc(db, 'tenants', tenant.id), {
      name: tenant.name,
      jrgUnits: tenant.jrgUnits,
      ospUnits: tenant.ospUnits,
      vehicles: {} // Empty initially, users will populate it
    });
  }
  
  alert('Baza wyczyszczona i zainicjalizowana!');
};
