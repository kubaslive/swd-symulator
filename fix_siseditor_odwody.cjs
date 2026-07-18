const fs = require('fs');
let code = fs.readFileSync('src/SisEditor.jsx', 'utf8');

// Update props
code = code.replace(
  `const SisEditor = ({ db, userProfile, onClose, tenantJrgUnits, tenantOspUnits, tenantVehicles, tenantUnitCoordinates }) => {`,
  `const SisEditor = ({ db, userProfile, onClose, tenantJrgUnits, tenantOspUnits, tenantVehicles, tenantUnitCoordinates, tenantOdwody }) => {`
);

// Add local state
code = code.replace(
  `const [unitCoordinates, setUnitCoordinates] = useState({ ...(tenantUnitCoordinates || {}) });`,
  `const [unitCoordinates, setUnitCoordinates] = useState({ ...(tenantUnitCoordinates || {}) });\n  const [odwody, setOdwody] = useState(Array.isArray(tenantOdwody) ? [...tenantOdwody] : []);\n  const [newOdwodName, setNewOdwodName] = useState('');`
);

// Update useEffect
code = code.replace(
  `setUnitCoordinates({ ...(tenantUnitCoordinates || {}) });`,
  `setUnitCoordinates({ ...(tenantUnitCoordinates || {}) });\n      setOdwody(Array.isArray(tenantOdwody) ? [...tenantOdwody] : []);`
);

code = code.replace(
  `}, [tenantJrgUnits, tenantOspUnits, tenantVehicles, tenantUnitCoordinates]);`,
  `}, [tenantJrgUnits, tenantOspUnits, tenantVehicles, tenantUnitCoordinates, tenantOdwody]);`
);

// Update payload
code = code.replace(
  `vehicles: vehicles,
        unitCoordinates: unitCoordinates`,
  `vehicles: vehicles,
        unitCoordinates: unitCoordinates,
        odwody: odwody`
);

// Add UI tab button
code = code.replace(
  `<button className={\`classic-tab \${activeTab === 'map' ? 'active' : ''}\`} onClick={() => setActiveTab('map')}>Mapa SiS</button>`,
  `<button className={\`classic-tab \${activeTab === 'map' ? 'active' : ''}\`} onClick={() => setActiveTab('map')}>Mapa SiS</button>\n          <button className={\`classic-tab \${activeTab === 'odwody' ? 'active' : ''}\`} onClick={() => setActiveTab('odwody')}>Grupy / Odwody</button>`
);

// Add UI content
const targetEnd = `{activeTab === 'map' && (`;
const replaceEnd = `{activeTab === 'odwody' && (
          <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>Struktura Odwodów Operacyjnych i Grup</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input 
                type="text" 
                placeholder="Nazwa grupy (np. Pluton Katowice, Kompania Śląsk)" 
                value={newOdwodName} 
                onChange={(e) => setNewOdwodName(e.target.value)}
                style={{ flex: 1, padding: '4px' }}
              />
              <button 
                onClick={() => {
                  if (newOdwodName.trim()) {
                    if (!odwody.find(o => o.id === newOdwodName.trim())) {
                      setOdwody([...odwody, { id: newOdwodName.trim(), name: newOdwodName.trim(), vehicles: [] }]);
                      setNewOdwodName('');
                    } else {
                      alert('Grupa o takiej nazwie już istnieje.');
                    }
                  }
                }}
                className="btn-win"
              >Dodaj Grupę</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {odwody.map(grp => (
                <div key={grp.id} style={{ border: '1px solid #ccc', padding: '8px', background: '#f9f9f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>{grp.name}</strong>
                    <button className="btn-win" style={{ color: 'red' }} onClick={() => {
                      if (window.confirm('Na pewno usunąć tę grupę?')) {
                        setOdwody(odwody.filter(o => o.id !== grp.id));
                      }
                    }}>Usuń Grupę</button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '4px' }}>
                    {[...jrgUnits, ...ospUnits].map(uName => {
                      const uVehicles = vehicles[uName] || [];
                      if (uVehicles.length === 0) return null;
                      return uVehicles.map(v => {
                        const vFullName = \`\${uName} | \${v.name}\`;
                        const isChecked = grp.vehicles?.includes(vFullName);
                        return (
                          <label key={vFullName} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input 
                              type="checkbox" 
                              checked={!!isChecked}
                              onChange={(e) => {
                                const newOdwody = [...odwody];
                                const currentGrp = newOdwody.find(o => o.id === grp.id);
                                if (!currentGrp.vehicles) currentGrp.vehicles = [];
                                
                                if (e.target.checked) {
                                  if (!currentGrp.vehicles.includes(vFullName)) {
                                    currentGrp.vehicles.push(vFullName);
                                  }
                                } else {
                                  currentGrp.vehicles = currentGrp.vehicles.filter(name => name !== vFullName);
                                }
                                setOdwody(newOdwody);
                              }}
                            />
                            {vFullName}
                          </label>
                        );
                      });
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'map' && (`

code = code.replace(targetEnd, replaceEnd);

fs.writeFileSync('src/SisEditor.jsx', code);
