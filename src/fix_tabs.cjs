const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = "{/* Action buttons at the bottom */}";
const replacement = `</div>
              
              {/* ZAKŁADKA: DZIENNIK */}
              <div style={{ flex: 1, overflowY: 'auto', display: incidentModalTab === 'dziennik' ? 'block' : 'none', background: '#fff', border: '1px solid #999', padding: '5px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px' }}>Dziennik Działań Zdarzenia</h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                  {(activeIncident?.eventHistory || []).map((ev, i) => (
                    <div key={i} style={{ padding: '3px', borderBottom: '1px dashed #ccc' }}>
                      <strong>[{ev.time}]</strong> {ev.user}: {ev.action}
                    </div>
                  ))}
                  {(!activeIncident?.eventHistory || activeIncident.eventHistory.length === 0) && (
                    <div style={{ color: '#888' }}>Brak wpisów w dzienniku.</div>
                  )}
                </div>
              </div>

              {/* Action buttons at the bottom */}`;

if (content.includes(target) && !content.includes("ZAKŁADKA: DZIENNIK")) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Fix tabs applied.");
} else {
  console.log("Fix tabs target not found or already applied.");
}
