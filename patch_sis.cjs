const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Fix update functions to catch errors
content = content.replace(
  /  const updateTenantVehicles = async \(newVehicles\) => \{[\s\S]*?  \};\n\n  const updateTenantUnits = async \(jrg, osp\) => \{[\s\S]*?  \};\n/g,
  `  const updateTenantVehicles = async (newVehicles) => {
    if (!userProfile || !userProfile.tenantId) {
      alert('Błąd: Konto nie ma przypisanego miasta.'); return;
    }
    try {
      const tenantRef = doc(db, 'tenants', userProfile.tenantId);
      await updateDoc(tenantRef, { vehicles: newVehicles });
    } catch (err) {
      console.error("Firebase save error:", err);
      alert("Błąd zapisu do Firebase: " + err.message);
    }
  };
  
  const updateTenantUnits = async (jrg, osp) => {
    if (!userProfile || !userProfile.tenantId) {
      alert('Błąd: Konto nie ma przypisanego miasta.'); return;
    }
    try {
      const tenantRef = doc(db, 'tenants', userProfile.tenantId);
      await updateDoc(tenantRef, { jrgUnits: jrg, ospUnits: osp });
    } catch (err) {
      console.error("Firebase save error:", err);
      alert("Błąd zapisu do Firebase: " + err.message);
    }
  };
`
);

// 2. Fix the currentUnit logic inside renderKatalogSiS
content = content.replace(
  /  const renderKatalogSiS = \(\) => \{[\s\S]*?const setVehiclesCatalog = [^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n/,
  `  const renderKatalogSiS = () => {
    const vehiclesCatalog = tenantVehicles || {};
    const setVehiclesCatalog = (updater) => {
      const prev = tenantVehicles || {};
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      updateTenantVehicles(updated);
    };
    const allUnits = [...(tenantJrgUnits || []), ...(tenantOspUnits || [])];
    const currentUnit = sisSelectedUnit && allUnits.includes(sisSelectedUnit) ? sisSelectedUnit : (allUnits[0] || '');
`
);

// 3. Replace sisSelectedUnit with currentUnit where appropriate in renderKatalogSiS
// First, the unitVehicles assignment
content = content.replace(/const unitVehicles = vehiclesCatalog\[sisSelectedUnit\] \|\| \[\];/g, 'const unitVehicles = vehiclesCatalog[currentUnit] || [];');

// Save edited vehicle
content = content.replace(/updated\[sisSelectedUnit\] = \(updated\[sisSelectedUnit\] \|\| \[\]\)/g, 'updated[currentUnit] = (updated[currentUnit] || [])');
content = content.replace(/\$\{sisSelectedUnit\}/g, '${currentUnit}');

// Add new vehicle
content = content.replace(/\[sisSelectedUnit\]: \[\.\.\.\(prev\[sisSelectedUnit\] \|\| \[\]\), newVeh\]/g, '[currentUnit]: [...(prev[currentUnit] || []), newVeh]');

// Delete vehicle
content = content.replace(/\[sisSelectedUnit\]: \(prev\[sisSelectedUnit\] \|\| \[\]\)\.filter/g, '[currentUnit]: (prev[currentUnit] || []).filter');

// Toggle OOS
content = content.replace(/\[sisSelectedUnit\]: \(prev\[sisSelectedUnit\] \|\| \[\]\)\.map/g, '[currentUnit]: (prev[currentUnit] || []).map');

// 4. Fix Dropdown in renderKatalogSiS
content = content.replace(
  /<select\n\s*value=\{sisSelectedUnit\}\n\s*onChange=\{e => \{ setSisSelectedUnit\(e\.target\.value\); setSisEditingVehicle\(null\); setSisIsAddingVehicle\(false\); \}\}\n\s*style=\{\{ fontSize: '11px', padding: '3px 6px', border: '2px inset #808080', background: '#fff', minWidth: '260px' \}\}\n\s*>\n\s*\{Object\.keys\(vehiclesCatalog\)\.map\(unit => \(\n\s*<option key=\{unit\} value=\{unit\}>\{unit\} \(\{\(vehiclesCatalog\[unit\] \|\| \[\]\)\.length\} pojazdów\)<\/option>\n\s*\)\)\}\n\s*<\/select>/g,
  `<select
                  value={currentUnit}
                  onChange={e => { setSisSelectedUnit(e.target.value); setSisEditingVehicle(null); setSisIsAddingVehicle(false); }}
                  style={{ fontSize: '11px', padding: '3px 6px', border: '2px inset #808080', background: '#fff', minWidth: '260px' }}
                  disabled={allUnits.length === 0}
                >
                  {allUnits.length === 0 ? <option value="">Brak jednostek - dodaj najpierw KM/KP w Zarządzaniu Jednostkami</option> : null}
                  {allUnits.map(unit => (
                    <option key={unit} value={unit}>{unit} ({(vehiclesCatalog[unit] || []).length} pojazdów)</option>
                  ))}
                </select>`
);

// 5. Ensure "Dodaj" button works by logging and guarding
// We already replaced sisSelectedUnit with currentUnit in `Add new vehicle` logic.
// We must also disable the button if currentUnit is empty.
content = content.replace(
  /onClick=\{\(\) => \{ setSisIsAddingVehicle\(true\); setSisEditingVehicle\(null\); \}\}/,
  `onClick={() => { if (!currentUnit) { alert("Dodaj najpierw jednostkę JRG lub OSP!"); return; } setSisIsAddingVehicle(true); setSisEditingVehicle(null); }}`
);

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx patched to fix sisSelectedUnit and dropdown dependencies.');
