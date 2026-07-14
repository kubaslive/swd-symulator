const fs = require('fs');

let app = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Inject toggleVehicleStandby function
const standbyFunc = `
  const toggleVehicleStandby = async (unitName, vehicleName) => {
    try {
      if (userProfile?.role !== 'admin' && userProfile?.role !== 'pa_jrg' && userProfile?.role !== 'dyspozytor') return;
      const updatedVehicles = { ...tenantVehicles };
      if (!updatedVehicles[unitName]) return;
      const vIndex = updatedVehicles[unitName].findIndex(v => v.name === vehicleName);
      if (vIndex !== -1) {
        updatedVehicles[unitName][vIndex].isStandby = !updatedVehicles[unitName][vIndex].isStandby;
        
        // This requires import of doc, updateDoc, db, which are already present.
        await updateDoc(doc(db, 'tenantSettings', 'default'), { vehicles: updatedVehicles });
        logAction(\`[\${unitName}] Pojazd \${vehicleName} \${updatedVehicles[unitName][vIndex].isStandby ? 'postawiony w Stan Gotowości (PZR)' : 'wycofany ze Stanu Gotowości'}.\`);
      }
    } catch (err) {
      console.error("Błąd zapisywania gotowości pojazdu:", err);
    }
  };
`;

if (!app.includes('const toggleVehicleStandby')) {
  app = app.replace('const toggleVehicleOutOfService = (unitName, vehicleName) => {', standbyFunc + '\n  const toggleVehicleOutOfService = (unitName, vehicleName) => {');
}

fs.writeFileSync('src/App.jsx', app);
console.log("toggleVehicleStandby injected!");
