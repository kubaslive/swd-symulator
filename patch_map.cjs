const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Add incidentView state
content = content.replace(/const \[activeMenuTab, setActiveMenuTab\] = useState\('dysponowanie'\);/, 
  "const [activeMenuTab, setActiveMenuTab] = useState('dysponowanie');\n  const [incidentView, setIncidentView] = useState('list');");

// Inject Map Toggle & Map Component
const oldTableBlock = `<div className="incident-table-pane border-inset" style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Removed old WCPR banner; now handled in Bufor zdarzeń tab */}

              <div className="incident-table-container" style={{ flex: 1 }} onClick={() => setSelectedIncidentId(null)}>`;

const newTableBlock = `<div className="incident-table-pane border-inset" style={{ display: 'flex', flexDirection: 'column' }}>
              
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
`;

content = content.replace(oldTableBlock, newTableBlock);

// Ensure the table is hidden when incidentView is 'map'
// We wrap the table inside a div that gets hidden
const tableStart = `<table className="swd-table-dark">`;
const tableEndStr = `</table>
              </div>`;

content = content.replace(tableStart, `<div style={{ display: incidentView === 'list' ? 'block' : 'none', height: '100%' }}>\n                <table className="swd-table-dark">`);
content = content.replace(tableEndStr, `</table>\n                </div>\n              </div>`);


fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx patched map!');
