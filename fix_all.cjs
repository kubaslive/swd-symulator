const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add Import
content = content.replace("import 'leaflet/dist/leaflet.css';", "import { getRandomStreetWithCoords } from './addressData';\nimport 'leaflet/dist/leaflet.css';");

// 2. Fix Generator
content = content.replace(/window\._triggerManualWCPR = async \(\) => \{[\s\S]*?let location = `\$\{city\}, ul\. \$\{street\} \$\{houseNum\}`;/, `window._triggerManualWCPR = async () => {
      const callerName = \`\${randomElement(firstNames)} \${randomElement(lastNames)}\`;
      const phone = \`\${Math.floor(500 + Math.random() * 200)}-\${Math.floor(100 + Math.random() * 800)}-\${Math.floor(100 + Math.random() * 800)}\`;
      const type = randomElement(["pozar", "mz", "pozar", "mz", "mz"]);
      const dynamicScenarios = dbScenarios.filter(s => s.type === type);
      const offlineScenarios = DEFAULT_SCENARIOS.filter(s => s.type === type);
      const scenarioObj = (dynamicScenarios.length > 0 && Math.random() > 0.4) ? randomElement(dynamicScenarios) : randomElement(offlineScenarios);
      
      const city = gameModeCities.length > 0 ? randomElement(gameModeCities) : "Katowice";
      const streetData = getRandomStreetWithCoords(city);
      const street = streetData.name;
      const incidentCoords = { lat: streetData.lat, lng: streetData.lon };
      const houseNum = Math.floor(Math.random() * 150) + 1;
      let location = \`\${streetData.city}, ul. \${street} \${houseNum}\`;`);

content = content.replace(/let activeStreets = streets;[\s\S]*?let location = "";/g, `let location = "";`);
content = content.replace(/const streetObj = randomElement\(activeStreets\);[\s\S]*?const houseNum = Math\.floor\(Math\.random\(\) \* 150\) \+ 1;/g, 
`const streetData = getRandomStreetWithCoords(city);
          const street = streetData.name;
          const incidentCoords = { lat: streetData.lat, lng: streetData.lon };
          const houseNum = Math.floor(Math.random() * 150) + 1;`);

content = content.replace(/let street2Obj = randomElement\(activeStreets\); let street2 = typeof street2Obj === 'object' \? street2Obj\.name : street2Obj;[\s\S]*?location = `\$\{city\}, Skrzyżowanie ul\. \$\{street\} z ul\. \$\{street2\}`;/g,
`const street2Data = getRandomStreetWithCoords(city);
            const street2 = street2Data.name;
            location = \`\${streetData.city}, Skrzyżowanie ul. \${street} z ul. \${street2}\`;`);


// 3. Add incidentView State
content = content.replace(/const \[activeMenuTab, setActiveMenuTab\] = useState\('dysponowanie'\);/, 
  "const [activeMenuTab, setActiveMenuTab] = useState('dysponowanie');\n  const [incidentView, setIncidentView] = useState('list');");

// 4. Inject Map UI precisely!
const targetUI = `<div className="incident-table-pane border-inset" style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Removed old WCPR banner; now handled in Bufor zdarzeń tab */}

              <div className="incident-table-container" style={{ flex: 1 }} onClick={() => setSelectedIncidentId(null)}>`;

const replacementUI = `<div className="incident-table-pane border-inset" style={{ display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ display: 'flex', gap: '5px', padding: '4px', background: 'var(--win-face)', borderBottom: '1px solid var(--win-shadow)' }}>
                <button className={\`btn-win \${incidentView === 'list' ? 'active' : ''}\`} onClick={() => setIncidentView('list')} style={{ fontWeight: incidentView === 'list' ? 'bold' : 'normal' }}>📋 Rejestr wyjazdów</button>
                <button className={\`btn-win \${incidentView === 'map' ? 'active' : ''}\`} onClick={() => setIncidentView('map')} style={{ fontWeight: incidentView === 'map' ? 'bold' : 'normal' }}>🗺️ Mapa Zdarzeń (GIS)</button>
              </div>

              <div className="incident-table-container" style={{ flex: 1, position: 'relative' }} onClick={() => setSelectedIncidentId(null)}>
                
                {incidentView === 'map' && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
                    <MapContainer center={[50.2587, 19.0175]} zoom={11} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {incidents.filter(i => !i.isArchived && i.coords).map(inc => (
                        <CircleMarker 
                          key={inc.id} 
                          center={[parseFloat(inc.coords.lat), parseFloat(inc.coords.lng)]}
                          radius={8}
                          color={inc.type?.toLowerCase().includes('pozar') ? '#d13438' : '#e67700'}
                          fillColor={inc.type?.toLowerCase().includes('pozar') ? '#f03e3e' : '#f59f00'}
                          fillOpacity={0.7}
                          eventHandlers={{
                            click: () => setSelectedIncidentId(inc.id)
                          }}
                        >
                          <Popup>
                            <div style={{ fontSize: '11px', minWidth: '150px' }}>
                              <strong style={{ color: '#005fb8' }}>{inc.customId}</strong><br/>
                              Rodzaj: <strong>{inc.type}</strong><br/>
                              Adres: {inc.location}<br/>
                              Zastępy: {inc.vehicles?.length || 0}<br/>
                              <button className="btn-win" style={{ marginTop: '5px', width: '100%' }} onClick={() => {
                                setSelectedIncidentId(inc.id);
                                setIsIncidentModalOpen(true);
                                setIncidentModalTab('formatka');
                              }}>Otwórz Kartę Zdarzenia</button>
                            </div>
                          </Popup>
                          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                            <span style={{ fontSize: '10px' }}>{inc.customId}</span>
                          </Tooltip>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                  </div>
                )}

                <div style={{ display: incidentView === 'list' ? 'block' : 'none', height: '100%' }}>
`;

content = content.replace(targetUI, replacementUI);

// Now close the div that wraps the table.
// Find the exact table close tag for the main incidents table.
// The main table starts with `<table className="swd-table-dark">`
// And ends at the end of `.incident-table-container` block.
// I will just look for `</table>` followed by `</div>` and then `</div>` 
// wait, the previous code was:
// </table>
// </div>
// {/* Right side: Context Menu panels */}

content = content.replace(/<\/table>\s*<\/div>\s*\{\/\* Right side: Context Menu/m, `</table>\n                </div>\n              </div>\n\n              {/* Right side: Context Menu`);

fs.writeFileSync('src/App.jsx', content);
console.log('Done');
