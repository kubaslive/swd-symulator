const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const target1 = `            {/* FORMULARZ ZDARZENIA (Karta zdarzenia) */}`;
const replace1 = `            {/* FORMULARZ ZDARZENIA (Karta zdarzenia) */}
            {activeIncident.requiredSgr && !activeIncident.sgrFulfilled && (
              <div style={{ background: '#ffe3e3', color: '#c92a2a', padding: '8px', border: '1px solid #fa5252', borderRadius: '4px', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>⚠️</span> 
                PILNE: Zdarzenie wymaga wsparcia Specjalistycznej Grupy Ratowniczej - {activeIncident.requiredSgr}
              </div>
            )}`;

code = code.replace(target1, replace1);

const target2 = `const canCloseIncident = () => {`;
const replace2 = `const canCloseIncident = () => {
    if (activeIncident?.requiredSgr && !activeIncident?.sgrFulfilled) return false;`;

code = code.replace(target2, replace2);

fs.writeFileSync('src/App.jsx', code);
