const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Remove vehiclesCatalog useState and local storage
content = content.replace(/  const \[vehiclesCatalog, setVehiclesCatalog\] = useState\(\(\) => \{[\s\S]*?\}\);\n/g, '');
content = content.replace(/  useEffect\(\(\) => \{\n    localStorage\.setItem\('swd_vehiclesCatalog', JSON\.stringify\(vehiclesCatalog\)\);\n  \}, \[vehiclesCatalog\]\);\n/g, '');

// 2. Add update functions inside App component (right where we removed it)
const updateFunctions = `
  const updateTenantVehicles = async (newVehicles) => {
    if (!userProfile || !userProfile.tenantId) {
      alert('Konto WSKR bez miasta - brak własnej bazy.'); return;
    }
    const tenantRef = doc(db, 'tenants', userProfile.tenantId);
    await updateDoc(tenantRef, { vehicles: newVehicles });
  };
  
  const updateTenantUnits = async (jrg, osp) => {
    if (!userProfile || !userProfile.tenantId) return;
    const tenantRef = doc(db, 'tenants', userProfile.tenantId);
    await updateDoc(tenantRef, { jrgUnits: jrg, ospUnits: osp });
  };
`;
content = content.replace(/  const \[sisSelectedUnit, setSisSelectedUnit\]/, updateFunctions + '\n  const [sisSelectedUnit, setSisSelectedUnit]');

// 3. In renderKatalogSiS, inject setVehiclesCatalog closure and change reads
content = content.replace(/  const renderKatalogSiS = \(\) => \{/g, `  const renderKatalogSiS = () => {\n    const vehiclesCatalog = tenantVehicles;\n    const setVehiclesCatalog = (updater) => {\n      const prev = tenantVehicles;\n      const updated = typeof updater === 'function' ? updater(prev) : updater;\n      updateTenantVehicles(updated);\n    };`);

// 4. Add the Jednostki tab button
content = content.replace(/\{\[\['pojazdy','🚒 Pojazdy \(Flotala\)'\],\['sprzet','🔧 Sprzęt Specjalistyczny'\],\['srodki','🧯 Środki Gaśnicze'\]\]\.map/g, 
  "{[['jednostki', '🏢 Zarządzanie Jednostkami'], ['pojazdy','🚒 Pojazdy (Flotala)'],['sprzet','🔧 Sprzęt Specjalistyczny'],['srodki','🧯 Środki Gaśnicze']].map");

// 5. Add the Jednostki tab content
const jednostkiTabContent = `
        {/* ===== TAB: JEDNOSTKI ===== */}
        {sisActiveTab === 'jednostki' && (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#000080' }}>Jednostki PSP (JRG)</h4>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                <input type="text" id="newJrgName" placeholder="Nazwa JRG" className="input-field" style={{ flex: 1 }} />
                <button className="btn-win" onClick={() => {
                  const val = document.getElementById('newJrgName').value;
                  if (val && !tenantJrgUnits.includes(val)) updateTenantUnits([...tenantJrgUnits, val], tenantOspUnits);
                  document.getElementById('newJrgName').value = '';
                }}>Dodaj</button>
              </div>
              <ul style={{ background: '#fff', border: '1px solid #808080', padding: '5px', minHeight: '200px' }}>
                {tenantJrgUnits.map(u => (
                  <li key={u} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc' }}>
                    {u}
                    <span style={{ color: 'red', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => {
                      if (window.confirm('Usunąć?')) updateTenantUnits(tenantJrgUnits.filter(x => x !== u), tenantOspUnits);
                    }}>X</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#000080' }}>Jednostki OSP</h4>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                <input type="text" id="newOspName" placeholder="Nazwa OSP" className="input-field" style={{ flex: 1 }} />
                <button className="btn-win" onClick={() => {
                  const val = document.getElementById('newOspName').value;
                  if (val && !tenantOspUnits.includes(val)) updateTenantUnits(tenantJrgUnits, [...tenantOspUnits, val]);
                  document.getElementById('newOspName').value = '';
                }}>Dodaj</button>
              </div>
              <ul style={{ background: '#fff', border: '1px solid #808080', padding: '5px', minHeight: '200px' }}>
                {tenantOspUnits.map(u => (
                  <li key={u} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc' }}>
                    {u}
                    <span style={{ color: 'red', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => {
                      if (window.confirm('Usunąć?')) updateTenantUnits(tenantJrgUnits, tenantOspUnits.filter(x => x !== u));
                    }}>X</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
`;
content = content.replace(/        \{\/\* ===== TAB: POJAZDY ===== \*\/\}/, jednostkiTabContent + '\n        {/* ===== TAB: POJAZDY ===== */}');

// 6. Enable Bufor button
content = content.replace(/<button className="tab-btn" style=\{\{ color: '#808080', borderLeft: '1px solid #d4d0c8', marginLeft: '4px' \}\} disabled>Bufor zdarzeń<\/button>/, 
  `<button className="tab-btn" style={{ borderLeft: '1px solid #d4d0c8', marginLeft: '4px' }} onClick={() => setActiveMenuTab('bufor')}>Bufor zdarzeń</button>`);

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx modified with new Katalog SiS functionality');
