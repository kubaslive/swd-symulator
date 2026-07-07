const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const oldVehicles = `  const updateTenantVehicles = async (newVehicles) => {
    if (!userProfile || !userProfile.tenantId) {
      alert('Konto WSKR bez miasta - brak własnej bazy.'); return;
    }
    const tenantRef = doc(db, 'tenants', userProfile.tenantId);
    await updateDoc(tenantRef, { vehicles: newVehicles });
  };`;

const newVehicles = `  const updateTenantVehicles = async (newVehicles) => {
    if (!userProfile || !userProfile.tenantId) {
      alert('Konto WSKR bez miasta - brak własnej bazy. Aby edytować SiS, zaloguj się jako Dyspozytor konkretnego miasta.'); return;
    }
    try {
      const tenantRef = doc(db, 'tenants', userProfile.tenantId);
      await updateDoc(tenantRef, { vehicles: newVehicles });
    } catch (err) {
      console.error(err);
      alert('Błąd bazy danych: ' + err.message);
    }
  };`;

const oldUnits = `  const updateTenantUnits = async (jrg, osp) => {
    if (!userProfile || !userProfile.tenantId) return;
    const tenantRef = doc(db, 'tenants', userProfile.tenantId);
    await updateDoc(tenantRef, { jrgUnits: jrg, ospUnits: osp });
  };`;

const newUnits = `  const updateTenantUnits = async (jrg, osp) => {
    if (!userProfile || !userProfile.tenantId) {
      alert('Konto WSKR bez miasta - brak własnej bazy. Aby zarządzać jednostkami, zaloguj się jako Dyspozytor konkretnego miasta.'); return;
    }
    try {
      const tenantRef = doc(db, 'tenants', userProfile.tenantId);
      await updateDoc(tenantRef, { jrgUnits: jrg, ospUnits: osp });
    } catch (err) {
      console.error(err);
      alert('Błąd bazy danych: ' + err.message);
    }
  };`;

content = content.replace(oldVehicles, newVehicles).replace(oldUnits, newUnits);
fs.writeFileSync('src/App.jsx', content);
