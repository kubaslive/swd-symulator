const fs = require('fs');

let app = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Footer Replacement
const oldFooterStart = '<footer className="bottom-console border-outset" style={{ display: \'flex\', gap: \'8px\', padding: \'4px\', height: \'120px\', background: \'#d4d0c8\' }}>';
const newFooter = `
<footer className="bottom-console border-outset" style={{ display: 'flex', gap: '8px', padding: '4px', height: '120px', background: '#d4d0c8' }}>
  {/* Left: Transmisja */}
  <div className="transmission-panel border-inset" style={{ flex: '0 0 250px', display: 'flex', flexDirection: 'column', background: '#e1e1e1' }}>
    <div style={{ padding: '2px 6px', background: '#b0b0b0', fontWeight: 'bold', fontSize: '10px' }}>Transmisja</div>
    <div style={{ flex: 1, padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: '8px', height: '8px', background: isConnected ? '#00cc00' : '#cc0000', border: '1px solid #000' }}></div>
        <span>Stan SIWCPR: {isConnected ? 'OK' : 'BŁĄD'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: '8px', height: '8px', background: '#cc0000', border: '1px solid #000' }}></div>
        <span>Błędy (0)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: '8px', height: '8px', background: '#ffcc00', border: '1px solid #000' }}></div>
        <span>Aktualizacje zdarzeń</span>
      </div>
      <input type="text" value="Rejestr wyjazdów" readOnly style={{ marginTop: 'auto', background: '#fff', border: '1px inset #a0a0a0', padding: '2px', fontSize: '10px' }} />
    </div>
  </div>

  {/* Middle-Left: Clock */}
  <div className="border-inset" style={{ flex: '0 0 150px', display: 'flex', flexDirection: 'column', background: '#d4d0c8', border: '1px solid #a0a0a0' }}>
    <div style={{ padding: '2px 6px', background: '#b0b0b0', fontWeight: 'bold', fontSize: '10px', textAlign: 'center' }}>
      {systemTime.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontFamily: 'var(--font-mono)', letterSpacing: '1px', background: '#e8e8e8', border: '1px inset #a0a0a0', margin: '2px' }}>
      {systemTime.toLocaleTimeString('pl-PL')}
    </div>
  </div>

  {/* Middle-Right: Terminale statusów (Dziennik Radiowy) */}
  <div className="border-inset" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e0dfde', minWidth: '300px' }}>
    <div style={{ padding: '2px 6px', background: '#b0b0b0', fontWeight: 'bold', fontSize: '10px' }}>Terminale statusów</div>
    <div style={{ flex: 1, overflowY: 'auto', padding: '2px 4px', fontSize: '10px', display: 'flex', flexDirection: 'column-reverse', background: '#e8e8e8' }}>
      {(activeIncident?.radioLogs || []).slice().reverse().map((msg, idx) => (
        <div key={idx} style={{ color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>
          {msg.time || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('pl-PL') : '')} <strong>{msg.from || msg.senderName}</strong>: {msg.text}
        </div>
      ))}
    </div>
  </div>
</footer>
`;

// we need to slice out the old footer and everything until MAP MODAL if we can
const footerIdx = app.indexOf(oldFooterStart);
const dzIdx = app.indexOf('{/* --- DZIENNIK RADIOWY WIDGET --- */}');
const contextMenuIdx = app.indexOf('{/* Global overlay for context menu */}');

if (footerIdx !== -1 && dzIdx !== -1 && contextMenuIdx !== -1) {
  // Replace from footerIdx to contextMenuIdx
  app = app.substring(0, footerIdx) + newFooter + '\n' + app.substring(contextMenuIdx);
} else {
  console.log("Could not find blocks");
}

// 2. Tabs
app = app.replace(/<div className="tab-header">/g, '<div className="classic-tabs">');
app = app.replace(/<button className={`tab-btn \${combatTab === 'PSP' \? 'active' : ''}`} onClick={\(\) => setCombatTab\('PSP'\)}>PSP<\/button>/g, '<button className={`classic-tab ${combatTab === \'PSP\' ? \'active\' : \'\'}`} onClick={() => setCombatTab(\'PSP\')}><img src="https://img.icons8.com/color/48/000000/fire-station.png" style={{width: 12, height: 12}} alt="" /> PSP</button>');
app = app.replace(/<button className={`tab-btn \${combatTab === 'OSP' \? 'active' : ''}`} onClick={\(\) => setCombatTab\('OSP'\)}>OSP<\/button>/g, '<button className={`classic-tab ${combatTab === \'OSP\' ? \'active\' : \'\'}`} onClick={() => setCombatTab(\'OSP\')}><img src="https://img.icons8.com/color/48/000000/fire-truck.png" style={{width: 12, height: 12}} alt="" /> OSP</button>');
app = app.replace(/<button className={`tab-btn \${combatTab === 'SPECIALIST' \? 'active' : ''}`} onClick={\(\) => setCombatTab\('SPECIALIST'\)}>Specjaliści<\/button>/g, '<button className={`classic-tab ${combatTab === \'SPECIALIST\' ? \'active\' : \'\'}`} onClick={() => setCombatTab(\'SPECIALIST\')}><img src="https://img.icons8.com/color/48/000000/worker-male.png" style={{width: 12, height: 12}} alt="" /> Specjaliści</button>');
app = app.replace(/<button className={`tab-btn \${combatTab === 'AGENTS' \? 'active' : ''}`} onClick={\(\) => setCombatTab\('AGENTS'\)}>Inne<\/button>/g, '<button className={`classic-tab ${combatTab === \'AGENTS\' ? \'active\' : \'\'}`} onClick={() => setCombatTab(\'AGENTS\')}><img src="https://img.icons8.com/color/48/000000/police-badge.png" style={{width: 12, height: 12}} alt="" /> Inne</button>');
app = app.replace(/<button className={`tab-btn \${combatTab === 'WCPR' \? 'active' : ''}`}/g, '<button className={`classic-tab ${combatTab === \'WCPR\' ? \'active\' : \'\'}`}');
app = app.replace(/<button className="tab-btn" style={{ color: '#d1d1d1' }} disabled>Szukaj<\/button>/g, '');
app = app.replace(/<button className="tab-btn" style={{ color: '#d1d1d1' }} disabled>Zdarzenia planowane \(0\)<\/button>/g, '');

// 3. Tree backgrounds
app = app.replace(/className="combat-column" style={{ background: '#e0dfde' }}/g, 'className="combat-column" style={{ background: \'#ffffff\' }}');
app = app.replace(/className="combat-column" style={{ background: '#d4d0c8' }}/g, 'className="combat-column" style={{ background: \'#ffffff\' }}');


fs.writeFileSync('src/App.jsx', app);

let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('.classic-tab')) {
  css += `
.classic-tabs {
  display: flex;
  background: #d4d0c8;
  padding-top: 4px;
  padding-left: 2px;
  border-bottom: 1px solid #a0a0a0;
}
.classic-tab {
  background: #d4d0c8;
  border: 1px solid #fff;
  border-right-color: #a0a0a0;
  border-bottom-color: #a0a0a0;
  padding: 2px 8px;
  margin-right: 2px;
  font-size: 11px;
  cursor: pointer;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
  color: #000;
  display: flex;
  align-items: center;
  gap: 4px;
}
.classic-tab.active {
  background: #d4d0c8;
  border-bottom: 1px solid #d4d0c8; /* merge with below */
  position: relative;
  top: 1px;
  font-weight: bold;
}
`;
}
fs.writeFileSync('src/index.css', css);


