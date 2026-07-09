const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Highlight for Combat Board vehicles
const combatVehicleOld = `className="vehicle-row"
                            title={\`\${v.name} (\${uName})\\nStan: \${currentState}\\nObsada min.: \${v.obsada} os.\\nKliknij: \${selectedIncidentId && activeIncident ? 'Dopisz do zdarzenia' : 'Zmień status OOS'}\`}
                            onClick={() => {
                              if (isNewIncidentModalOpen) {`;

const combatVehicleNew = `className={\`vehicle-row \${window._selectedCombatVehicle === \`\${uName} | \${v.name}\` ? 'selected-combat' : ''}\`}
                            style={window._selectedCombatVehicle === \`\${uName} | \${v.name}\` ? { background: '#005fb8', color: '#fff' } : {}}
                            title={\`\${v.name} (\${uName})\\nStan: \${currentState}\\nObsada min.: \${v.obsada} os.\\nKliknij: \${selectedIncidentId && activeIncident ? 'Dopisz do zdarzenia' : 'Zmień status OOS'}\`}
                            onClick={() => {
                              window._selectedCombatVehicle = \`\${uName} | \${v.name}\`; document.dispatchEvent(new Event('render-trigger'));
                              if (isNewIncidentModalOpen) {`;
code = code.replace(combatVehicleOld, combatVehicleNew);

// Also add to right-click
const combatVehicleMenuOld = `onContextMenu={(e) => {
                              e.preventDefault();
                              const activeInc = incidents.find(inc => inc.status !== 'processed' && !inc.isArchived && inc.vehicles?.includes(\`\${uName} | \${v.name}\`));`;

const combatVehicleMenuNew = `onContextMenu={(e) => {
                              e.preventDefault();
                              window._selectedCombatVehicle = \`\${uName} | \${v.name}\`; document.dispatchEvent(new Event('render-trigger'));
                              const activeInc = incidents.find(inc => inc.status !== 'processed' && !inc.isArchived && inc.vehicles?.includes(\`\${uName} | \${v.name}\`));`;
code = code.replace(combatVehicleMenuOld, combatVehicleMenuNew);

// OSP Tablica Bojowa highlight
const ospVehicleOld = `className="vehicle-row"
                            title={\`\${v.name} (\${uName})\\nStan: \${currentState}\\nObsada min.: \${v.obsada} os.\\nKliknij: \${selectedIncidentId && activeIncident ? 'Dopisz do zdarzenia' : 'Zmień status OOS'}\`}
                            onClick={() => {
                              if (isNewIncidentModalOpen) {`;

const ospVehicleNew = `className={\`vehicle-row \${window._selectedCombatVehicle === \`\${uName} | \${v.name}\` ? 'selected-combat' : ''}\`}
                            style={window._selectedCombatVehicle === \`\${uName} | \${v.name}\` ? { background: '#005fb8', color: '#fff' } : {}}
                            title={\`\${v.name} (\${uName})\\nStan: \${currentState}\\nObsada min.: \${v.obsada} os.\\nKliknij: \${selectedIncidentId && activeIncident ? 'Dopisz do zdarzenia' : 'Zmień status OOS'}\`}
                            onClick={() => {
                              window._selectedCombatVehicle = \`\${uName} | \${v.name}\`; document.dispatchEvent(new Event('render-trigger'));
                              if (isNewIncidentModalOpen) {`;
// Use regex to replace ALL occurrences of combatVehicleOld, because OSP uses the exact same code
code = code.split(combatVehicleOld).join(ospVehicleNew);
code = code.split(combatVehicleMenuOld).join(combatVehicleMenuNew);


fs.writeFileSync('src/App.jsx', code);
