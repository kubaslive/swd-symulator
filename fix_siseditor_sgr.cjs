const fs = require('fs');
let code = fs.readFileSync('src/SisEditor.jsx', 'utf8');

// Add vehSgr state
code = code.replace(
  "const [vehType, setVehType] = useState('GBA');",
  "const [vehType, setVehType] = useState('GBA');\n  const [vehSgr, setVehSgr] = useState('');"
);

// Add sgr to new vehicle object
code = code.replace(
  "const newVeh = { name: vehName.trim(), obsada: parseInt(vehObsada) || 4, type: vehType };",
  "const newVeh = { name: vehName.trim(), obsada: parseInt(vehObsada) || 4, type: vehType, sgr: vehSgr || null };\n    setVehSgr('');"
);

// Add the SGR select to the UI
code = code.replace(
  `<select value={vehType} onChange={e => setVehType(e.target.value)} className="input-field">`,
  `<select value={vehSgr} onChange={e => setVehSgr(e.target.value)} className="input-field" title="Specjalizacja">
                    <option value="">Brak SGR</option>
                    <option value="SGRW">SGRW</option>
                    <option value="SGRN">SGRN</option>
                    <option value="SGRChem-Eko">SGRChem-Eko</option>
                    <option value="SGPR">SGPR</option>
                    <option value="SGRT">SGRT</option>
                  </select>
                  <select value={vehType} onChange={e => setVehType(e.target.value)} className="input-field">`
);

// Update rendering to show the SGR tag if present
code = code.replace(
  `<span>{v.name} ({v.type}) - obsada: {v.obsada}</span>`,
  `<span>{v.name} ({v.type}) - obsada: {v.obsada} {v.sgr && <span style={{color: '#d13438', fontWeight: 'bold', marginLeft: '5px'}}>[{v.sgr}]</span>}</span>`
);

fs.writeFileSync('src/SisEditor.jsx', code);
