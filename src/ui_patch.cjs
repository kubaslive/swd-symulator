const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add green arrow for copying address
const targetCallerAddress = `                        <span style={{ fontSize: '9px', textAlign: 'right' }}>Miejscowość</span>
                        <input type="text" className="win-input" value={callerAddressStr} onChange={(e) => setCallerAddressStr(e.target.value)} />
                        <span style={{ fontSize: '9px', textAlign: 'right' }}>Ulica</span>
                        <input type="text" className="win-input" />`;

const replacementCallerAddress = `                        <span style={{ fontSize: '9px', textAlign: 'right' }}>Miejscowość</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <input type="text" className="win-input" style={{ flex: 1 }} value={callerAddressStr} onChange={(e) => setCallerAddressStr(e.target.value)} />
                          <button className="btn-win" style={{ fontSize: '10px', padding: '0 4px', color: 'green', fontWeight: 'bold' }} title="Skopiuj do Lokalizacji" onClick={(e) => { e.preventDefault(); setMiejscowoscStr(callerAddressStr); }}>➡️</button>
                        </div>
                        <span style={{ fontSize: '9px', textAlign: 'right' }}>Ulica</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <input type="text" className="win-input" style={{ flex: 1 }} id="caller_street" />
                          <button className="btn-win" style={{ fontSize: '10px', padding: '0 4px', color: 'green', fontWeight: 'bold' }} title="Skopiuj do Lokalizacji" onClick={(e) => { e.preventDefault(); handleLocationChange(document.getElementById('caller_street').value); }}>➡️</button>
                        </div>`;

if (content.includes(targetCallerAddress)) {
    content = content.replace(targetCallerAddress, replacementCallerAddress);
}

// 2. Add PLI CBD button
const targetLegend = `<legend style={{ fontSize: '9px' }}>Dane osoby zgłaszającej</legend>`;
const replacementLegend = `<legend style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          Dane osoby zgłaszającej
                          <button className="btn-win" style={{ fontSize: '8px', padding: '1px 3px', background: '#ffe3e3', color: '#c92a2a', fontWeight: 'bold' }} onClick={(e) => {
                            e.preventDefault();
                            if(window.confirm('Pobieranie lokalizacji telefonu z bazy UKE. Może być bardzo niedokładne. Kontynuować?')) {
                               setCallerAddressStr(cityPool?.[0] || 'Warszawa');
                               document.getElementById('caller_street').value = 'BTS MAszt ' + Math.floor(Math.random()*900);
                            }
                          }}>PLI CBD</button>
                        </legend>`;
                        
if (content.includes(targetLegend)) {
    content = content.replace(targetLegend, replacementLegend);
}

// 3. Red text for missing streets
const targetMiejscowosc = `<span style={{ fontSize: '9px', textAlign: 'right' }}>Miejscowość</span>
                      <input type="text" className="win-input" value={miejscowoscStr} onChange={(e) => setMiejscowoscStr(e.target.value)} />`;
const replacementMiejscowosc = `<span style={{ fontSize: '9px', textAlign: 'right' }}>Miejscowość</span>
                      <input type="text" className="win-input" style={{ color: tenantName !== miejscowoscStr && !gameModeCities.includes(miejscowoscStr) ? 'red' : 'black' }} value={miejscowoscStr} onChange={(e) => setMiejscowoscStr(e.target.value)} />`;

if (content.includes(targetMiejscowosc)) {
    content = content.replace(targetMiejscowosc, replacementMiejscowosc);
}

const targetUlica = `<span style={{ fontSize: '9px', textAlign: 'right' }}>Adres</span>
                      <input type="text" className="win-input" value={location} onChange={(e) => handleLocationChange(e.target.value)} style={{ gridColumn: '2 / span 3' }} />`;
const replacementUlica = `<span style={{ fontSize: '9px', textAlign: 'right' }}>Adres</span>
                      <input type="text" className="win-input" value={location} onChange={(e) => handleLocationChange(e.target.value)} style={{ gridColumn: '2 / span 3', color: tenantStreets.length > 0 && !tenantStreets.some(s => location.includes(s)) ? 'red' : 'black' }} />`;
                      
if (content.includes(targetUlica)) {
    content = content.replace(targetUlica, replacementUlica);
}

fs.writeFileSync(file, content);
console.log("UI Patch applied!");
