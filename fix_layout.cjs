const fs = require('fs');

let app = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Move Clock to the left of Terminale statusów
const clockHTML = `
  {/* Clock (Moved to Middle-Left) */}
  <div className="border-inset" style={{ flex: '0 0 150px', display: 'flex', flexDirection: 'column', background: '#d4d0c8', border: '1px solid #a0a0a0' }}>
    <div style={{ padding: '2px 6px', background: '#b0b0b0', fontWeight: 'bold', fontSize: '10px', textAlign: 'center' }}>
      {systemTime.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontFamily: 'var(--font-mono)', letterSpacing: '1px', background: '#e8e8e8', border: '1px inset #a0a0a0', margin: '2px' }}>
      {systemTime.toLocaleTimeString('pl-PL')}
    </div>
  </div>
`;

// Extract clock from right, put it after Transmisja
// First, find the Transmisja div end
const transmisjaEndStr = '</div>\n  </div>\n\n  {/* Middle: Terminale statusów';
const newTransmisjaEnd = '</div>\n  </div>\n' + clockHTML + '\n  {/* Middle: Terminale statusów';

app = app.replace(transmisjaEndStr, newTransmisjaEnd);

// Remove the old clock from the right
const oldClockStart = '{/* Right: Duży Zegar */}';
const oldClockEnd = '</div>\n</footer>';
const clockStartIndex = app.indexOf(oldClockStart);
if (clockStartIndex !== -1) {
  const clockEndIndex = app.indexOf(oldClockEnd, clockStartIndex);
  if (clockEndIndex !== -1) {
    app = app.substring(0, clockStartIndex) + app.substring(clockEndIndex);
  }
}

// 2. Add classic Tabs styling
// The tabs need to look like classic Windows tabs
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

// Replace .tab-header and .tab-btn with .classic-tabs
app = app.replace(/<div className="tab-header">/g, '<div className="classic-tabs">');
app = app.replace(/<button className={`tab-btn \${combatTab === 'PSP' \? 'active' : ''}`} onClick={\(\) => setCombatTab\('PSP'\)}>PSP<\/button>/g, '<button className={`classic-tab ${combatTab === \'PSP\' ? \'active\' : \'\'}`} onClick={() => setCombatTab(\'PSP\')}><img src="https://img.icons8.com/color/48/000000/fire-station.png" style={{width: 12, height: 12}} alt="" /> PSP</button>');
app = app.replace(/<button className={`tab-btn \${combatTab === 'OSP' \? 'active' : ''}`} onClick={\(\) => setCombatTab\('OSP'\)}>OSP<\/button>/g, '<button className={`classic-tab ${combatTab === \'OSP\' ? \'active\' : \'\'}`} onClick={() => setCombatTab(\'OSP\')}><img src="https://img.icons8.com/color/48/000000/fire-truck.png" style={{width: 12, height: 12}} alt="" /> OSP</button>');
app = app.replace(/<button className={`tab-btn \${combatTab === 'SPECIALIST' \? 'active' : ''}`} onClick={\(\) => setCombatTab\('SPECIALIST'\)}>Specjaliści<\/button>/g, '<button className={`classic-tab ${combatTab === \'SPECIALIST\' ? \'active\' : \'\'}`} onClick={() => setCombatTab(\'SPECIALIST\')}><img src="https://img.icons8.com/color/48/000000/worker-male.png" style={{width: 12, height: 12}} alt="" /> Specjaliści</button>');
app = app.replace(/<button className={`tab-btn \${combatTab === 'AGENTS' \? 'active' : ''}`} onClick={\(\) => setCombatTab\('AGENTS'\)}>Inne<\/button>/g, '<button className={`classic-tab ${combatTab === \'AGENTS\' ? \'active\' : \'\'}`} onClick={() => setCombatTab(\'AGENTS\')}><img src="https://img.icons8.com/color/48/000000/police-badge.png" style={{width: 12, height: 12}} alt="" /> Inne</button>');
app = app.replace(/<button className={`tab-btn \${combatTab === 'WCPR' \? 'active' : ''}`}/g, '<button className={`classic-tab ${combatTab === \'WCPR\' ? \'active\' : \'\'}`}');
app = app.replace(/<button className="tab-btn" style={{ color: '#d1d1d1' }} disabled>Szukaj<\/button>/g, '');
app = app.replace(/<button className="tab-btn" style={{ color: '#d1d1d1' }} disabled>Zdarzenia planowane \(0\)<\/button>/g, '');

fs.writeFileSync('src/App.jsx', app);
console.log("Layout patched");
