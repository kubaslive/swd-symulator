const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Replace the classic tabs buttons
const targetTabs = `<div className="classic-tabs">
          <button className={\`classic-tab \${combatTab === 'PSP' ? 'active' : ''}\`} onClick={() => setCombatTab('PSP')}><img src="https://img.icons8.com/color/48/000000/fire-station.png" style={{width: 12, height: 12}} alt="" /> PSP</button>
          <button className={\`classic-tab \${combatTab === 'OSP' ? 'active' : ''}\`} onClick={() => setCombatTab('OSP')}><img src="https://img.icons8.com/color/48/000000/fire-truck.png" style={{width: 12, height: 12}} alt="" /> OSP</button>
          <button className={\`classic-tab \${combatTab === 'SPECIALIST' ? 'active' : ''}\`} onClick={() => setCombatTab('SPECIALIST')}><img src="https://img.icons8.com/color/48/000000/worker-male.png" style={{width: 12, height: 12}} alt="" /> Specjaliści</button>
          <button className={\`classic-tab \${combatTab === 'AGENTS' ? 'active' : ''}\`} onClick={() => setCombatTab('AGENTS')}><img src="https://img.icons8.com/color/48/000000/police-badge.png" style={{width: 12, height: 12}} alt="" /> Inne</button>
          <button className={\`classic-tab \${combatTab === 'WCPR' ? 'active' : ''}\`} style={{ borderLeft: '1px solid #f3f3f3', marginLeft: '4px', color: incomingCalls.length > 0 ? '#d13438' : '#000000', fontWeight: incomingCalls.length > 0 ? 'bold' : 'normal' }} onClick={() => setCombatTab('WCPR')}>Bufor zdarzeń {incomingCalls.length > 0 ? \`(\${incomingCalls.length})\` : ''}</button>
          
          
        </div>`;

const replaceTabs = `<div className="classic-tabs">
          <button className={\`classic-tab \${combatTab === 'PSP' ? 'active' : ''}\`} onClick={() => setCombatTab('PSP')}><img src="https://img.icons8.com/color/48/000000/fire-station.png" style={{width: 12, height: 12}} alt="" /> PSP</button>
          <button className={\`classic-tab \${combatTab === 'OSP' ? 'active' : ''}\`} onClick={() => setCombatTab('OSP')}><img src="https://img.icons8.com/color/48/000000/fire-truck.png" style={{width: 12, height: 12}} alt="" /> OSP</button>
          <button className={\`classic-tab \${combatTab === 'SPECIALIST' ? 'active' : ''}\`} onClick={() => setCombatTab('SPECIALIST')}><img src="https://img.icons8.com/color/48/000000/worker-male.png" style={{width: 12, height: 12}} alt="" /> Specjaliści</button>
          <button className={\`classic-tab \${combatTab === 'ODWODY' ? 'active' : ''}\`} onClick={() => setCombatTab('ODWODY')}><img src="https://img.icons8.com/color/48/000000/map-pin.png" style={{width: 12, height: 12}} alt="" /> Odwody Operacyjne</button>
          <button className={\`classic-tab \${combatTab === 'AGENTS' ? 'active' : ''}\`} onClick={() => setCombatTab('AGENTS')}><img src="https://img.icons8.com/color/48/000000/police-badge.png" style={{width: 12, height: 12}} alt="" /> Inne</button>
          <button className={\`classic-tab \${combatTab === 'WCPR' ? 'active' : ''}\`} style={{ borderLeft: '1px solid #f3f3f3', marginLeft: '4px', color: incomingCalls.length > 0 ? '#d13438' : '#000000', fontWeight: incomingCalls.length > 0 ? 'bold' : 'normal' }} onClick={() => setCombatTab('WCPR')}>Bufor zdarzeń {incomingCalls.length > 0 ? \`(\${incomingCalls.length})\` : ''}</button>
        </div>`;

if (code.includes(targetTabs)) {
  code = code.replace(targetTabs, replaceTabs);
} else {
  console.log("Could not find targetTabs block.");
}

// Now replace SPECIALIST rendering logic
// We need to render the SGR vehicles there.
// Let's find the current SPECIALIST block.

const targetSpecialist = `{combatTab === 'SPECIALIST' && (
            // Specialists Directory (Page 38)
            <div style={{ padding: '8px', overflowY: 'auto', height: '100%', background: '#ffffff' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000', marginBottom: '6px', borderBottom: '1px solid #d1d1d1', paddingBottom: '3px', textTransform: 'uppercase' }}>Ewidencja Specjalistów (Str. 38 instrukcji)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {SIMULATED_SPECIALISTS.map(spec => (
                  <div key={spec.name} className="border-outset" style={{ padding: '6px', background: '#f8f9fa' }}>
                    <strong style={{ fontSize: '10.5px', color: '#005fb8' }}>{spec.name}</strong>
                    <div style={{ fontSize: '9px', color: '#000', margin: '2px 0' }}>{spec.role}</div>
                    <div style={{ fontSize: '8.5px', color: '#555' }}>Jednostka: {spec.unit} | Rejon: {spec.area}</div>
                    <div style={{ fontSize: '8.5px', color: '#555' }}>Tel: {spec.tel} | Status: <span style={{ color: '#2b8a3e', fontWeight: 'bold' }}>{spec.status}</span></div>
                    {activeIncident && activeIncident.status !== 'processed' && (
                      <button 
                        className="btn-win" 
                        style={{ width: '100%', padding: '1px', marginTop: '4px', fontSize: '9px', fontWeight: 'bold' }}
                        onClick={() => {
                          logIncidentHistory(activeIncident.id, \`Zadysponowano doradcę specjalistycznego: \${spec.name} (\${spec.role.replace("Specjalizacja: ", "")})\`);
                          logAction(\`Zadysponowano doradcę: \${spec.name}\`);
                          alert(\`Zadysponowano specjalistę \${spec.name} do doradztwa przy zdarzeniu.\`);
                        }}
                      >
                        📞 Zadysponuj jako doradcę (KDR)
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}`;

const replaceSpecialist = `{combatTab === 'SPECIALIST' && (
            <div style={{ padding: '4px', overflowY: 'auto', height: '100%', background: '#ffffff' }}>
              {["KM/KP PSP", ...(tenantJrgUnits || [])].map(uName => {
                const sgrVehicles = (tenantVehicles?.[uName] || []).filter(v => !!v.sgr);
                if (sgrVehicles.length === 0) return null;
                return (
                  <div key={uName} style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', background: '#005fb8', color: '#fff', padding: '2px 4px', marginBottom: '2px' }}>
                      {uName} - Specjalistyczne Grupy Ratownicze
                    </div>
                    {sgrVehicles.map((v, i) => {
                      const actualUName = uName;
                      const isCrossedOut = getVehicleState(actualUName, v.name) === "Wycofany" || v.outOfService;
                      return (
                        <div 
                          key={i}
                          className="vehicle-row"
                          onClick={() => {
                            if (selectedIncidentId && activeIncident && activeIncident.status !== 'processed') {
                              if (!isCrossedOut && !v.isStandby) {
                                addVehicleToActiveIncident(\`\${actualUName} | \${v.name}\`);
                              }
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedCombatVehicle(\`\${actualUName} | \${v.name}\`);
                            const activeInc = incidents.find(inc => inc.status !== 'processed' && !inc.isArchived && inc.vehicles?.includes(\`\${actualUName} | \${v.name}\`));
                            setVehicleContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              uName: actualUName,
                              vName: v.name,
                              isOos: v.outOfService,
                              isStandby: v.isStandby,
                              activeIncId: activeInc?.id
                            });
                          }}
                        >
                          <div className="vehicle-info">
                            {renderTable4StatusIcon(actualUName, v.name)}
                            <span className={\`vehicle-name \${isCrossedOut ? 'crossed-out' : ''}\`} style={{ fontSize: '10px' }}>
                              {v.name} [{v.sgr}]
                            </span>
                          </div>
                          <span className="vehicle-obsada">
                            {isCrossedOut ? '0' : v.obsada}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}`;

if (code.includes(targetSpecialist)) {
  code = code.replace(targetSpecialist, replaceSpecialist);
} else {
  console.log("Could not find targetSpecialist block.");
}

fs.writeFileSync('src/App.jsx', code);
