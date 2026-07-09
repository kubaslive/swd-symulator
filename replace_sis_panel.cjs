const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Replace the forces-pane tabs and layout
const originalForcesPane = code.substring(code.indexOf('{/* Right side: Dispatched Units (Siły i Środki / SOP Tabs) */}'), code.indexOf('/* SOP Checklist panel */'));

const newForcesPane = `{/* Right side: Dispatched Units (Siły i Środki / SOP Tabs) */}
            <div className="forces-pane border-inset" style={{ position: 'relative' }}>
              
              {/* Tab selector */}
              <div style={{ display: 'flex', background: '#f3f3f3', borderBottom: '1.5px solid #d1d1d1', userSelect: 'none' }}>
                <button 
                  onClick={() => setRightPanelTab('sis')}
                  style={{ flex: 1, fontSize: '9.5px', padding: '5px 4px', border: '1px solid transparent', borderBottom: 'none', background: rightPanelTab === 'sis' ? '#ffffff' : '#f3f3f3', color: '#000000', fontWeight: rightPanelTab === 'sis' ? 'bold' : 'normal', cursor: 'pointer', outline: 'none', borderTopLeftRadius: '2px', borderTopRightRadius: '2px', marginTop: '2px', borderTop: rightPanelTab === 'sis' ? '1.5px solid #d1d1d1' : 'none', borderLeft: rightPanelTab === 'sis' ? '1.5px solid #d1d1d1' : 'none', borderRight: rightPanelTab === 'sis' ? '1.5px solid #d1d1d1' : 'none' }}
                >
                  Wszystkie ({activeIncident?.vehicles?.length || 0})
                </button>
                <button 
                  onClick={() => setRightPanelTab('sis')}
                  style={{ flex: 1, fontSize: '9.5px', padding: '5px 4px', border: '1px solid transparent', borderBottom: 'none', background: rightPanelTab === 'sis' ? '#f3f3f3' : '#f3f3f3', color: '#000000', fontWeight: 'normal', cursor: 'pointer', outline: 'none', borderTopLeftRadius: '2px', borderTopRightRadius: '2px', marginTop: '2px' }}
                >
                  Pojazdy ({activeIncident?.vehicles?.length || 0})
                </button>
                <button 
                  onClick={() => setRightPanelTab('sop')}
                  style={{ flex: 1, fontSize: '9.5px', padding: '5px 4px', border: '1px solid transparent', borderBottom: 'none', background: rightPanelTab === 'sop' ? '#ffffff' : '#f3f3f3', color: '#000000', fontWeight: rightPanelTab === 'sop' ? 'bold' : 'normal', cursor: 'pointer', outline: 'none', borderTopLeftRadius: '2px', borderTopRightRadius: '2px', marginTop: '2px', borderTop: rightPanelTab === 'sop' ? '1.5px solid #d1d1d1' : 'none', borderLeft: rightPanelTab === 'sop' ? '1.5px solid #d1d1d1' : 'none', borderRight: rightPanelTab === 'sop' ? '1.5px solid #d1d1d1' : 'none' }}
                >
                  Algorytmy SOP
                </button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                {rightPanelTab === 'sis' ? (
                  <>
                    {/* Dyspozycje Toolbar */}
                    <div style={{ display: 'flex', gap: '2px', padding: '2px 4px', background: '#f3f3f3', borderBottom: '1px solid #d1d1d1' }}>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px' }} title="Meldunek EWID-ST" onClick={() => setIsEwidReportModalOpen(true)}>📄</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px' }} title="Wyjazd do akcji">▶️</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px' }} title="Zawrócenie z trasy">↩️</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px' }} title="Lokalizacja zagrożenia">📍</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px' }} title="Drukuj" onClick={() => setPrintPreviewMode('karta_manipulacyjna')}>🖨️</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px', color: '#888' }} title="Brak opcji">🚛</button>
                      <button className="btn-win" style={{ padding: '2px 6px', fontSize: '10px', color: '#8b008b', fontWeight: 'bold' }} title="Lokalizacja zagrożenia">L</button>
                    </div>

                    {/* SiS Table */}
                    {activeIncident && activeIncident.vehicles && activeIncident.vehicles.length > 0 ? (
                      <table className="swd-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '24px', textAlign: 'center', padding: '2px' }}></th>
                            <th style={{ padding: '2px 4px', textAlign: 'left' }}>Nazwa</th>
                            <th style={{ padding: '2px 4px', textAlign: 'left' }}>Kryptonim</th>
                            <th style={{ padding: '2px 4px', textAlign: 'left' }}>Jednostka użytkownika...</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeIncident.vehicles.map((vStr, i) => {
                            if (!vStr) return null;
                            const parts = vStr.split(' | ');
                            const unit = parts[0] || '---';
                            const vName = parts[1] || vStr;
                            
                            const vStatus = activeIncident.vehicleStatuses?.[vStr] || 0;
                            
                            let statusIcon = "⚠️";
                            let statusColor = "#000000";
                            let statusBg = i % 2 === 0 ? '#ffffff' : '#fafafa';
                            
                            if (vStatus === 1) { statusIcon = "▶️"; statusColor = "#c92a2a"; } 
                            else if (vStatus === 2) { statusIcon = "📍"; statusColor = "#c92a2a"; } 
                            else if (vStatus === 3) { statusIcon = "◀️"; statusColor = "#2b8a3e"; } 
                            else if (vStatus === 4) { statusIcon = "🏠"; statusColor = "#2b8a3e"; } 
                            else if (vStatus === 0) { statusIcon = "⏳"; statusColor = "#555555"; } 
                            
                            if (vStatus === 1 || vStatus === 2) {
                              statusBg = '#e3e3e3'; 
                            } else if (vStatus === 3 || vStatus === 4) {
                              statusBg = '#ffffff'; 
                            }
                            
                            return (
                              <tr 
                                key={i} 
                                style={{ background: statusBg, cursor: 'default' }}
                                onContextMenu={(e) => openVehicleContextMenu(e, vStr)}
                              >
                                <td style={{ textAlign: 'center', padding: '1px 2px', fontSize: '10px' }}>{statusIcon}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor, fontWeight: 'bold' }}>{vName}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor }}>{vStr}</td>
                                <td style={{ padding: '1px 4px', fontSize: '9.5px', color: statusColor }}>{unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#d1d1d1', padding: '20px', fontSize: '10px' }}>
                        Brak przypisanych sił i środków.
                      </div>
                    )}
                  </>
                ) : (
                  `;

code = code.replace(originalForcesPane, newForcesPane);

// Context Menu Replacement
const originalContextMenu = code.substring(code.indexOf('{/* context menu simulator */}'), code.indexOf('{/* Ewidencja Hydrantow Nearby Search Display */}'));

const newContextMenu = `{/* context menu simulator */}
              {activeContextMenuVehicle && (
                <div 
                  className="border-outset"
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.stopPropagation()}
                  style={{ 
                    position: 'fixed', 
                    left: \`\${contextMenuPosition.x}px\`, 
                    top: \`\${contextMenuPosition.y}px\`, 
                    zIndex: 9999, 
                    background: '#f3f3f3', 
                    padding: '2px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    minWidth: '160px',
                    boxShadow: '2px 2px 5px rgba(0,0,0,0.5)',
                    fontSize: '11px'
                  }}
                >
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 1)}>▶️ Wyjazd do akcji</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 0)}>↩️ Zawrócenie z trasy</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 2)}>🔽 Dojazd do MK</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 1)}>🔼 Wyjazd z MK</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#c92a2a', fontWeight: 'bold' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 2)}>📍 Na miejscu zdarzenia</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#8b008b', fontWeight: 'bold' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 2)}>L Lokalizacja zagrożenia</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#2b8a3e', fontWeight: 'bold' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 3)}>◀️ Zakończenie działań</button>
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#2b8a3e', fontWeight: 'bold' }} onClick={() => handleSetVehicleStatus(activeContextMenuVehicle, 4)}>🏠 Powrót do bazy</button>
                  <div style={{ height: '1px', backgroundColor: '#d1d1d1', margin: '2px 0' }} />
                  
                  {activeIncident && activeIncident.type === 'pzr' && (
                    <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#005fb8' }} onClick={() => handleReturnPzrVehicle(activeContextMenuVehicle)}>↩️ Zwróć sprzęt (Koniec zabezpiecz.)</button>
                  )}

                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none' }} onClick={() => {
                    const vStr = activeContextMenuVehicle;
                    setCrewTargetVehicle(vStr);
                    const currentCrew = activeIncident.crew?.[vStr] || {};
                    const metrics = activeIncident.vehicleMetrics?.[vStr] || { km: 0, fuel: 0 };
                    setCrewDowodca(currentCrew.dowodca || '');
                    setCrewKierowca(currentCrew.kierowca || '');
                    setCrewRatownicy(currentCrew.ratownicy || '');
                    setCrewKm(metrics.km || 0);
                    setCrewFuel(metrics.fuel || 0);
                    setIsCrewModalOpen(true);
                  }}>👤 Obsada imienna i metryki</button>
                  
                  {activeContextMenuVehicle.includes('OSP') && (
                    <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#d13438' }} onClick={() => triggerOspSiren(activeContextMenuVehicle.split(' | ')[0])}>🔊 DSP-50 Syrena alarmowa</button>
                  )}
                  {activeContextMenuVehicle.includes('JRG') && (
                    <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#0b7285' }} onClick={() => triggerDwaPrinter(activeContextMenuVehicle.split(' | ')[0])}>🖨️ Formatka DWA</button>
                  )}
                  <div style={{ height: '1px', backgroundColor: '#d1d1d1', margin: '2px 0' }} />
                  <button className="btn-win" style={{ justifyContent: 'flex-start', padding: '3px 8px', border: 'none', boxShadow: 'none', color: '#d13438' }} onClick={() => removeVehicleFromActiveIncident(activeContextMenuVehicle)}>❌ Wycofaj zastęp (Błąd)</button>
                </div>
              )}
              
              `;

code = code.replace(originalContextMenu, newContextMenu);

fs.writeFileSync('src/App.jsx', code);
