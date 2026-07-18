const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

// Replace the column title with a tree node
const oldTitle = `
                    <div className="combat-column-title" style={{ background: '#f3f3f3' }}>
                      <span title={uName}>
                        {uName.includes('JRG nr 1') ? 'JRG 1' :
                         uName.includes('JRG nr 2') ? 'JRG 2' :
                         uName.includes('JRG nr 3') ? 'JRG 3' :
                         uName.includes('KM PSP') ? 'KM/KP PSP' : uName}
                      </span>
                      <span style={{ background: activeCount > 0 ? '#2b8a3e' : '#c00000', color: '#fff', padding: '0 4px', fontFamily: 'var(--font-mono)', minWidth: '18px', textAlign: 'center' }}>
                        {activeCount}
                      </span>
                    </div>
`;

const newTitle = `
                    <div className="combat-column-title" style={{ background: '#f0f0f0', borderBottom: '1px solid #d1d1d1', padding: '2px 4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#000' }}>
                      <button style={{ width: '12px', height: '12px', padding: 0, margin: 0, fontSize: '9px', lineHeight: '9px', background: '#fff', border: '1px solid #888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                      <img src="https://img.icons8.com/color/48/000000/fire-station.png" style={{ width: 14, height: 14 }} alt="JRG" />
                      <span title={uName} style={{ flex: 1 }}>
                        {uName}
                      </span>
                      <span style={{ color: '#000', padding: '0 4px', fontFamily: 'var(--font-mono)' }}>
                        {activeCount}
                      </span>
                    </div>
`;

code = code.replace(oldTitle, newTitle);

// Replace the vehicle row to look like a tree child
const oldRow = `
                          <div 
                            key={v.name} 
                            className={\`vehicle-row \${selectedCombatVehicle === \`\${actualUName} | \${v.name}\` ? 'selected-combat' : ''}\`}
                            style={{
                              ...(selectedCombatVehicle === \`\${actualUName} | \${v.name}\` ? { background: '#0a246a', color: '#fff' } : {}),
                              ...(actualUName.includes('OSP') ? { borderRight: \`4px solid \${currentState === 'W koszarach' ? '#2b8a3e' : '#c92a2a'}\` } : {})
                            }}
                            title={\`\${v.name} (\${actualUName})\\nKryptonim: \${v.kryptonim || 'Brak'}\\nStan: \${currentState}\\nObsada min.: \${v.obsada} os.\\nKliknij: \${selectedIncidentId && activeIncident ? 'Dopisz do zdarzenia' : 'Zmień status OOS'}\`}
                            onClick={() => {
                              setSelectedCombatVehicle(\`\${actualUName} | \${v.name}\`);
                              if (isNewIncidentModalOpen) {
                                handleAddToIncident(actualUName, v.name);
                              }
                            }}
                          >
                            <div className="vehicle-name-block">
                              {renderTable4StatusIcon(actualUName, v.name)}
                              <span className="v-name" style={{ textDecoration: isCrossedOut ? 'line-through' : 'none' }}>
                                {v.name} {actualUName.includes('JRG') && !actualUName.includes('KM/KP') ? \`[\${actualUName.replace(/\\D/g, '')}]\` : ''}
                              </span>
                            </div>
                            <span className="v-obsada" style={{ color: selectedCombatVehicle === \`\${actualUName} | \${v.name}\` ? '#fff' : '#666' }}>{v.obsada}</span>
                          </div>
`;

const newRow = `
                          <div 
                            key={v.name} 
                            className={\`vehicle-row \${selectedCombatVehicle === \`\${actualUName} | \${v.name}\` ? 'selected-combat' : ''}\`}
                            style={{
                              padding: '2px 4px 2px 20px',
                              borderBottom: 'none',
                              fontSize: '10.5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              color: '#000',
                              ...(selectedCombatVehicle === \`\${actualUName} | \${v.name}\` ? { background: '#005fb8', color: '#fff' } : {})
                            }}
                            title={\`\${v.name} (\${actualUName})\\nKryptonim: \${v.kryptonim || 'Brak'}\\nStan: \${currentState}\\nObsada min.: \${v.obsada} os.\\nKliknij: \${selectedIncidentId && activeIncident ? 'Dopisz do zdarzenia' : 'Zmień status OOS'}\`}
                            onClick={() => {
                              setSelectedCombatVehicle(\`\${actualUName} | \${v.name}\`);
                              if (isNewIncidentModalOpen) {
                                handleAddToIncident(actualUName, v.name);
                              }
                            }}
                          >
                            <div className="vehicle-name-block" style={{ display: 'flex', alignItems: 'center' }}>
                              {renderTable4StatusIcon(actualUName, v.name)}
                              <span className="v-name" style={{ textDecoration: isCrossedOut ? 'line-through' : 'none', color: isCrossedOut ? '#888' : 'inherit' }}>
                                {v.name} {actualUName.includes('JRG') && !actualUName.includes('KM/KP') ? \`[\${actualUName.replace(/\\D/g, '')}]\` : ''}
                              </span>
                            </div>
                            <span className="v-obsada" style={{ color: selectedCombatVehicle === \`\${actualUName} | \${v.name}\` ? '#fff' : '#000' }}>{currentState === 'Wycofany' || currentState === 'Niedostępny' ? 0 : v.obsada}</span>
                          </div>
`;

code = code.replace(oldRow, newRow);

// One more place, for OSP view (if combatTab === 'OSP')
const oldOspRow = `
                      {vehicles.map(v => {
                        const actualUName = v.originalUnit || uName;
                        const isCrossedOut = getVehicleState(actualUName, v.name) === "Wycofany" || v.outOfService;
                        const currentState = getVehicleState(actualUName, v.name);
                        
                        return (
                          <div 
                            key={v.name} 
                            className={\`vehicle-row \${selectedCombatVehicle === \`\${actualUName} | \${v.name}\` ? 'selected-combat' : ''}\`}
                            style={{
                              ...(selectedCombatVehicle === \`\${actualUName} | \${v.name}\` ? { background: '#0a246a', color: '#fff' } : {}),
                              ...(actualUName.includes('OSP') ? { borderRight: \`4px solid \${currentState === 'W koszarach' ? '#2b8a3e' : '#c92a2a'}\` } : {})
                            }}
`;

const newOspRow = `
                      {vehicles.map(v => {
                        const actualUName = v.originalUnit || uName;
                        const isCrossedOut = getVehicleState(actualUName, v.name) === "Wycofany" || v.outOfService;
                        const currentState = getVehicleState(actualUName, v.name);
                        
                        return (
                          <div 
                            key={v.name} 
                            className={\`vehicle-row \${selectedCombatVehicle === \`\${actualUName} | \${v.name}\` ? 'selected-combat' : ''}\`}
                            style={{
                              padding: '2px 4px 2px 20px',
                              borderBottom: 'none',
                              fontSize: '10.5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              color: '#000',
                              ...(selectedCombatVehicle === \`\${actualUName} | \${v.name}\` ? { background: '#005fb8', color: '#fff' } : {})
                            }}
`;

code = code.replace(oldOspRow, newOspRow);


fs.writeFileSync('src/App.jsx', code);
console.log("Tree patched");
