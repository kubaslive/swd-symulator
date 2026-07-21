const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src/App.jsx');
let content = fs.readFileSync(p, 'utf8');

const specialistCode = `
              {SIMULATED_SPECIALISTS.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', background: '#333', color: '#fff', padding: '2px 4px', marginBottom: '4px' }}>
                    Ewidencja Doradców i Inspektorów
                  </div>
                  {SIMULATED_SPECIALISTS.map(spec => (
                    <div key={spec.id} style={{ display: 'flex', flexDirection: 'column', background: '#f5f5f5', padding: '4px', marginBottom: '4px', border: '1px solid #ccc', fontSize: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>{spec.role}</span>
                        <span style={{ color: '#005fb8' }}>{spec.name}</span>
                      </div>
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>tel: {spec.phone}</span>
                        <button 
                          className="btn-win" 
                          style={{ padding: '2px 4px', fontSize: '9px' }}
                          onClick={() => {
                            if (activeIncident && activeIncident.status !== 'processed') {
                              logIncidentHistory(activeIncident.id, \`Powiadomiono: \${spec.role} (\${spec.name})\`);
                              logAction(\`Powiadomiono specjalistę: \${spec.role}\`);
                              alert(\`Zawiadomiono specjalistę: \${spec.name}\`);
                            } else {
                              alert("Brak aktywnego zdarzenia.");
                            }
                          }}
                        >
                          Zadysponuj / Powiadom
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
`;

content = content.replace(/<\/div>\n\s*\)\s*}\)\}\n\s*<\/div>/, `</div>\n                );\n              })}\n${specialistCode}\n            </div>`);

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed SPECIALIST tab');
