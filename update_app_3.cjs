const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Remove IMGW alert by default
code = code.replace(
  "const [isMeteoAlertActive, setIsMeteoAlertActive] = useState(true);",
  "const [isMeteoAlertActive, setIsMeteoAlertActive] = useState(false);"
);

// 2. Add proper selectedSisVehicle state
code = code.replace(
  "const [battleAlarmModalOpen, setBattleAlarmModalOpen] = useState(false);",
  "const [battleAlarmModalOpen, setBattleAlarmModalOpen] = useState(false);\n  const [selectedSisVehicle, setSelectedSisVehicle] = useState(null);\n  const [selectedCombatVehicle, setSelectedCombatVehicle] = useState(null);"
);

// 3. Fix Dyspozycje Table Highlight
const dyspozycjeOld = `                            const isSelected = window._selectedSisVehicle === vStr;
                            if (isSelected) {
                              statusBg = '#005fb8';
                              statusColor = '#ffffff';
                            }
                            
                            return (
                              <tr 
                                key={i} 
                                style={{ background: statusBg, cursor: 'default' }}
                                onClick={() => { window._selectedSisVehicle = vStr; document.dispatchEvent(new Event('render-trigger')); }}
                                onContextMenu={(e) => { window._selectedSisVehicle = vStr; document.dispatchEvent(new Event('render-trigger')); openVehicleContextMenu(e, vStr); }}
                              >`;

const dyspozycjeNew = `                            const isSelected = selectedSisVehicle === vStr;
                            if (isSelected) {
                              statusBg = '#005fb8';
                              statusColor = '#ffffff';
                            }
                            
                            return (
                              <tr 
                                key={i} 
                                style={{ background: statusBg, cursor: 'default' }}
                                onClick={() => setSelectedSisVehicle(vStr)}
                                onContextMenu={(e) => { setSelectedSisVehicle(vStr); openVehicleContextMenu(e, vStr); }}
                              >`;
code = code.replace(dyspozycjeOld, dyspozycjeNew);

// 4. Fix Tablica Bojowa Highlight
const combatVehicleOld = `className={\`vehicle-row \${window._selectedCombatVehicle === \\\`\${uName} | \${v.name}\\\` ? 'selected-combat' : ''}\`}
                            style={window._selectedCombatVehicle === \\\`\${uName} | \${v.name}\\\` ? { background: '#005fb8', color: '#fff' } : {}}
                            title={\`\${v.name} (\${uName})\\nStan: \${currentState}\\nObsada min.: \${v.obsada} os.\\nKliknij: \${selectedIncidentId && activeIncident ? 'Dopisz do zdarzenia' : 'Zmień status OOS'}\`}
                            onClick={() => {
                              window._selectedCombatVehicle = \\\`\${uName} | \${v.name}\\\`; document.dispatchEvent(new Event('render-trigger'));`;
const combatVehicleNew = `className={\`vehicle-row \${selectedCombatVehicle === \\\`\${uName} | \${v.name}\\\` ? 'selected-combat' : ''}\`}
                            style={selectedCombatVehicle === \\\`\${uName} | \${v.name}\\\` ? { background: '#005fb8', color: '#fff' } : {}}
                            title={\`\${v.name} (\${uName})\\nStan: \${currentState}\\nObsada min.: \${v.obsada} os.\\nKliknij: \${selectedIncidentId && activeIncident ? 'Dopisz do zdarzenia' : 'Zmień status OOS'}\`}
                            onClick={() => {
                              setSelectedCombatVehicle(\`\${uName} | \${v.name}\`);`;
code = code.split(combatVehicleOld).join(combatVehicleNew); // Replaces both PSP and OSP

const combatMenuOld = `onContextMenu={(e) => {
                              e.preventDefault();
                              window._selectedCombatVehicle = \\\`\${uName} | \${v.name}\\\`; document.dispatchEvent(new Event('render-trigger'));`;
const combatMenuNew = `onContextMenu={(e) => {
                              e.preventDefault();
                              setSelectedCombatVehicle(\`\${uName} | \${v.name}\`);`;
code = code.split(combatMenuOld).join(combatMenuNew);

// 5. Add Kryptonim column to SiS Słowniki table
const tableHeadersOld = `<th style={thStyle}>Pojazd / Nr taktyczny</th>
                    <th style={thStyle}>Typ</th>`;
const tableHeadersNew = `<th style={thStyle}>Pojazd / Nr taktyczny</th>
                    <th style={thStyle}>Kryptonim</th>
                    <th style={thStyle}>Typ</th>`;
code = code.replace(tableHeadersOld, tableHeadersNew);

const tableDataOld = `                        <td style={{ ...tdStyle, color: '#888', width: '28px', textAlign: 'center' }}>{idx + 1}</td>
                        {isEditing ? (
                          <>
                            <td style={tdStyle}>
                              <input
                                type="text"
                                className="input-field"
                                value={sisEditForm.name || ''}
                                onChange={e => setSisEditForm(p => ({ ...p, name: e.target.value }))}
                                style={{ fontSize: '10px', width: '100%' }}
                              />
                              <input
                                type="text"
                                className="input-field"
                                placeholder="Kryptonim"
                                value={sisEditForm.kryptonim || ''}
                                onChange={e => setSisEditForm(p => ({ ...p, kryptonim: e.target.value }))}
                                style={{ fontSize: '10px', width: '100%', marginTop: '2px' }}
                              />
                            </td>
                            <td style={tdStyle}>`;
const tableDataNew = `                        <td style={{ ...tdStyle, color: '#888', width: '28px', textAlign: 'center' }}>{idx + 1}</td>
                        {isEditing ? (
                          <>
                            <td style={tdStyle}>
                              <input
                                type="text"
                                className="input-field"
                                value={sisEditForm.name || ''}
                                onChange={e => setSisEditForm(p => ({ ...p, name: e.target.value }))}
                                style={{ fontSize: '10px', width: '100%' }}
                              />
                            </td>
                            <td style={tdStyle}>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="Kryptonim"
                                value={sisEditForm.kryptonim || ''}
                                onChange={e => setSisEditForm(p => ({ ...p, kryptonim: e.target.value }))}
                                style={{ fontSize: '10px', width: '100%' }}
                              />
                            </td>
                            <td style={tdStyle}>`;
code = code.replace(tableDataOld, tableDataNew);

const tableDataStaticOld = `                          <>
                            <td style={{ ...tdStyle, fontWeight: 'bold', color: st.color }}>{v.name}</td>
                            <td style={tdStyle}>{v.type}</td>`;
const tableDataStaticNew = `                          <>
                            <td style={{ ...tdStyle, fontWeight: 'bold', color: st.color }}>{v.name}</td>
                            <td style={tdStyle}>{v.kryptonim || '---'}</td>
                            <td style={tdStyle}>{v.type}</td>`;
code = code.replace(tableDataStaticOld, tableDataStaticNew);


fs.writeFileSync('src/App.jsx', code);
