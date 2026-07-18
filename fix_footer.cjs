const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

const oldFooterStart = '<footer className="bottom-console border-outset">';
const oldFooterEnd = '{/* --- DZIENNIK RADIOWY WIDGET --- */}';

const newFooter = `
<footer className="bottom-console border-outset" style={{ display: 'flex', gap: '8px', padding: '4px', height: '120px', background: '#d4d0c8' }}>
  {/* Left: Transmisja */}
  <div className="transmission-panel border-inset" style={{ flex: '0 0 250px', display: 'flex', flexDirection: 'column', background: '#e1e1e1' }}>
    <div style={{ padding: '2px 6px', background: '#b0b0b0', fontWeight: 'bold', fontSize: '10px' }}>Transmisja</div>
    <div style={{ flex: 1, padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span className="led-indicator green" style={{ width: 8, height: 8 }} /> Stan SIWCPR: OK
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span className="led-indicator red" style={{ width: 8, height: 8 }} /> Błędy (0)
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span className="led-indicator yellow" style={{ width: 8, height: 8 }} /> Aktualizacje zdarzeń
      </div>
      <div style={{ marginTop: 'auto' }}>
        <button className="btn-win" style={{ width: '100%', textAlign: 'left', background: '#fff' }}>Rejestr wyjazdów</button>
      </div>
    </div>
  </div>

  {/* Middle: Terminale statusów (Dziennik Radiowy) */}
  <div className="border-inset" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff', minWidth: '300px' }}>
    <div style={{ padding: '2px 6px', background: '#b0b0b0', fontWeight: 'bold', fontSize: '10px' }}>Terminale statusów</div>
    <div style={{ flex: 1, overflowY: 'auto', padding: '2px 4px', fontSize: '10px', display: 'flex', flexDirection: 'column-reverse', background: '#e8e8e8' }}>
      {(activeIncident?.radioLogs || []).slice().reverse().map((msg, idx) => (
        <div key={idx} style={{ color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>
          {msg.time || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('pl-PL') : '')} <strong>{msg.from || msg.senderName}</strong>: {msg.message}
        </div>
      ))}
    </div>
  </div>

  {/* Right: Duży Zegar */}
  <div className="border-inset" style={{ flex: '0 0 250px', display: 'flex', flexDirection: 'column', background: '#e1e1e1' }}>
    <div style={{ padding: '2px 6px', background: '#b0b0b0', fontWeight: 'bold', fontSize: '10px', textAlign: 'center' }}>
      {systemTime.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>
      {systemTime.toLocaleTimeString('pl-PL')}
    </div>
  </div>
</footer>
{/* --- OLD DZIENNIK RADIOWY REMOVED --- */}
`;

const startIndex = code.indexOf(oldFooterStart);
const endIndex = code.indexOf(oldFooterEnd);

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newFooter + code.substring(endIndex);
  
  // Also remove the old floating radio log
  const nextDivEnd = code.indexOf('</div>\n        )}', code.indexOf('isRadioLogOpen &&'));
  if (nextDivEnd !== -1) {
    const radioLogStart = code.indexOf('<div style={{ position: \'fixed\', bottom: \'26px\'');
    const fullRadioLogEnd = code.indexOf('</div>\n        )}', radioLogStart) + 16;
    code = code.substring(0, radioLogStart) + code.substring(fullRadioLogEnd);
  }
}

fs.writeFileSync('src/App.jsx', code);
console.log("Footer patched");
