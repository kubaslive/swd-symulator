const fs = require('fs');
let code = fs.readFileSync('src/SisEditor.jsx', 'utf8');

if (!code.includes('unitCoordinates')) {
  // 1. Add unitCoordinates state
  code = code.replace(
    'const [vehicles, setVehicles] = useState({ ...(tenantVehicles || {}) });',
    'const [vehicles, setVehicles] = useState({ ...(tenantVehicles || {}) });\n  const [unitCoordinates, setUnitCoordinates] = useState({ ...(arguments[0].tenantUnitCoordinates || {}) });'
  );

  // 2. Add to useEffect
  code = code.replace(
    'setVehicles({ ...(tenantVehicles || {}) });',
    'setVehicles({ ...(tenantVehicles || {}) });\n      setUnitCoordinates({ ...(arguments[0].tenantUnitCoordinates || {}) });'
  );

  // 3. Add to handleSave
  code = code.replace(
    'vehicles\n      });',
    'vehicles,\n        unitCoordinates\n      });'
  );

  // 4. Update rendering in JRG Tab
  const jrgTabRender = `{jrgUnits.map(u => (
                <div key={u} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', padding: '2px 0' }}>
                  <span>{u}</span>
                  <button onClick={() => handleRemoveUnit('jrg', u)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none' }}>X</button>
                </div>
              ))}`;
  
  const jrgTabReplace = `{jrgUnits.map(u => (
                <div key={u} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #ccc', padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>{u}</span>
                    <button onClick={() => handleRemoveUnit('jrg', u)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none', fontSize: '10px' }}>X Usun</button>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                    <input type="text" placeholder="Lat (np. 50.25)" className="input-field" style={{ width: '80px', fontSize: '9px' }} value={unitCoordinates[u]?.lat || ''} onChange={(e) => setUnitCoordinates({...unitCoordinates, [u]: {...unitCoordinates[u], lat: e.target.value}})} />
                    <input type="text" placeholder="Lng (np. 19.02)" className="input-field" style={{ width: '80px', fontSize: '9px' }} value={unitCoordinates[u]?.lng || ''} onChange={(e) => setUnitCoordinates({...unitCoordinates, [u]: {...unitCoordinates[u], lng: e.target.value}})} />
                  </div>
                </div>
              ))}`;
  
  code = code.replace(jrgTabRender, jrgTabReplace);

  // 5. Update rendering in OSP Tab
  const ospTabRender = `{ospUnits.map(u => (
                <div key={u} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', padding: '2px 0' }}>
                  <span>{u}</span>
                  <button onClick={() => handleRemoveUnit('osp', u)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none' }}>X</button>
                </div>
              ))}`;
  
  code = code.replace(ospTabRender, jrgTabReplace.replaceAll('jrgUnits', 'ospUnits').replaceAll("'jrg'", "'osp'"));

  fs.writeFileSync('src/SisEditor.jsx', code);
  console.log("SisEditor patched!");
}
