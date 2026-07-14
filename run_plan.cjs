const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf-8');

// 1. Update Version
content = content.replace(/const APP_VERSION = "[^"]+";/, 'const APP_VERSION = "0.3.0 beta";');
if (content.includes('Wersja pierwotna')) {
  content = content.replace(
    /<p style={{ marginTop: '10px' }}><strong>v0.1 beta \(Wersja pierwotna\)<\/strong><\/p>/,
    `<p><strong>v0.3.0 beta (WCPR UI Rework)</strong></p><ul><li>Dodano zakładki Karty PSP i WCPR do widoku edycji.</li><li>Zreorganizowano widok przyjęcia WCPR do stylistyki SWD-ST.</li></ul><p style={{ marginTop: '10px' }}><strong>v0.1 beta (Wersja pierwotna)</strong></p>`
  );
}

// 2. Add WCPR tab in the Incident Modal (Karta Zdarzenia)
const tabsRegex = /<button\s+className={`tab-btn \${incidentModalTab === 'zgloszenie' \? 'active' : ''}`}.*?>Formatka SWD<\/button>/;
const newTabs = `<div style={{ display: 'flex', borderBottom: '1px solid #ccc', marginBottom: '5px', background: '#e1e1e1', paddingTop: '2px', paddingLeft: '4px' }}>
                <div style={{ padding: '2px 8px', border: '1px solid #999', borderBottom: 'none', background: '#fff', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'default' }}>
                   <img src="https://img.icons8.com/color/48/000000/google-logo.png" style={{width: 12, height: 12}} alt="G"/> ZG{activeIncident.customId?.replace('-', '/') || ''}
                </div>
                <div style={{ padding: '2px 8px', border: '1px solid #999', borderBottom: 'none', background: '#f0f0f0', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'default', color: '#555' }}>
                   <img src="https://img.icons8.com/color/48/000000/c-key.png" style={{width: 12, height: 12}} alt="C"/> SI WCPR ZD/{activeIncident.id?.substring(0,4).toUpperCase()}/{activeIncident.tenantId?.substring(0,3).toUpperCase() || 'KAT'}/{new Date().getFullYear()}
                </div>
              </div>
              <div style={{ display: 'flex', borderBottom: '1px solid #999', marginBottom: '5px' }}>
                <button className={\`tab-btn \${incidentModalTab === 'zgloszenie' ? 'active' : ''}\`} style={{ borderLeft: '1px solid #f3f3f3', marginLeft: '4px' }} onClick={() => setIncidentModalTab('zgloszenie')}>Karta Zdarzenia PSP</button>`;

content = content.replace(tabsRegex, newTabs);


// 3. Fix the WCPR Buffer table UI (remove phone icon, add accurate columns)
const oldTable = `<th style={{ width: '20px' }}></th>
                      <th style={{ width: '80px' }}>ID zdarzenia</th>
                      <th style={{ width: '120px' }}>Data i godzina</th>
                      <th style={{ width: '80px' }}>KP/KM</th>
                      <th>Miejsce zdarzenia</th>
                      <th style={{ width: '100px' }}>Zastępy</th>
                      <th style={{ width: '80px' }}>Rodzaj</th>
                      <th>Opis</th>`;
const newTable = `<th style={{ width: '30px' }}>Ikona</th>
                      <th style={{ width: '150px' }}>Nr Zdarzenia</th>
                      <th style={{ width: '120px' }}>Data i godzina</th>
                      <th style={{ width: '120px' }}>Zgłaszający</th>
                      <th style={{ width: '120px' }}>Miejscowość</th>
                      <th style={{ width: '120px' }}>Ulica</th>
                      <th style={{ width: '120px' }}>Obiekt</th>
                      <th style={{ width: '80px' }}>KP/KM</th>`;

content = content.replace(oldTable, newTable);

const oldRow = `<td style={{ textAlign: 'center' }}>📞</td>
                          <td>WCPR/{call.id.substring(0, 4)}</td>
                          <td>{new Date().toLocaleTimeString('pl-PL')}</td>
                          <td>SI WCPR</td>
                          <td>{call.address}</td>
                          <td>---</td>
                          <td><span className={\`badge badge-\${call.type || 'mz'}\`}>{call.type?.toUpperCase()}</span></td>
                          <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{call.description}</td>`;

const newRow = `<td style={{ textAlign: 'center' }}><img src="https://img.icons8.com/color/48/000000/c-key.png" style={{width: 14, height: 14}} alt="C" title="Zdarzenie z WCPR"/></td>
                          <td>SI WCPR ZD/{call.id.substring(0, 4).toUpperCase()}/{call.tenantId?.substring(0,3).toUpperCase() || 'KAT'}/{new Date().getFullYear()}</td>
                          <td>{new Date().toLocaleTimeString('pl-PL')}</td>
                          <td>WCPR {call.tenantId || 'WCPR'}</td>
                          <td>{call.miejscowoscStr || call.address?.split(',')[0]}</td>
                          <td>{call.location?.split('ul. ')[1]?.split(' ')[0] || 'Brak'}</td>
                          <td>{call.obiektStr || 'Brak'}</td>
                          <td>SI WCPR</td>`;
content = content.replace(oldRow, newRow);


fs.writeFileSync('src/App.jsx', content);
