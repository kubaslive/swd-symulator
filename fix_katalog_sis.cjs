const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Remove vehiclesCatalog useState and local storage usage (around line 517)
content = content.replace(/  const \[vehiclesCatalog, setVehiclesCatalog\] = useState\(\(\) => \{[\s\S]*?\}\);\n/g, '');

// 2. Remove localStorage save for vehiclesCatalog
content = content.replace(/  useEffect\(\(\) => \{\n    localStorage\.setItem\('swd_vehiclesCatalog', JSON\.stringify\(vehiclesCatalog\)\);\n  \}, \[vehiclesCatalog\]\);\n/g, '');

// 3. Define updateTenantVehicles helper (inside App component)
const updateTenantVehiclesStr = `
  const updateTenantVehicles = async (newVehicles) => {
    if (!userProfile || !userProfile.tenantId) {
      alert('Konto nie posiada miasta.'); return;
    }
    const tenantRef = doc(db, 'tenants', userProfile.tenantId);
    await updateDoc(tenantRef, { vehicles: newVehicles });
  };
`;
// Insert after const [vehiclesCatalog...] was removed
content = content.replace(/  const \[sisSelectedUnit, setSisSelectedUnit\]/g, updateTenantVehiclesStr + '\n  const [sisSelectedUnit, setSisSelectedUnit]');

// 4. Replace vehiclesCatalog with tenantVehicles in App.jsx
content = content.replace(/vehiclesCatalog/g, 'tenantVehicles');

// 5. Replace setVehiclesCatalog calls with updateTenantVehicles
content = content.replace(/setTenantVehicles\(prev => \{/g, 'updateTenantVehicles({ ...tenantVehicles,'); // Wait, setVehiclesCatalog(prev => ...) uses functional update!
