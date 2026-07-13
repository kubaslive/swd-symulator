const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state variable for the modal tab
if (!content.includes("const [incidentModalTab, setIncidentModalTab]")) {
  content = content.replace(
    "const [isNewIncidentModalOpen, setIsNewIncidentModalOpen] = useState(false);",
    "const [isNewIncidentModalOpen, setIsNewIncidentModalOpen] = useState(false);\n  const [incidentModalTab, setIncidentModalTab] = useState('formatka');"
  );
}

// 2. Add ownerId to new incidents
const newIncidentTarget = "targetJrg: targetJrg,";
if (content.includes(newIncidentTarget) && !content.includes("ownerId: userProfile?.uid")) {
    content = content.replace(
        "targetJrg: targetJrg,",
        "targetJrg: targetJrg,\n      ownerId: userProfile?.uid || 'unknown',"
    );
}

// 3. Add incidentModalTab rendering
const modalTargetStart = `<div className="win-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px', background: 'var(--win-face)' }}>`;

const modalReplacement = `<div className="win-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px', background: 'var(--win-face)', height: '600px' }}>
              
              {/* ZAKŁADKI KARTY ZDARZENIA */}
              <div style={{ display: 'flex', borderBottom: '1px solid #999', marginBottom: '5px' }}>
                <button 
                  onClick={() => setIncidentModalTab('formatka')}
                  style={{ padding: '5px 15px', fontWeight: incidentModalTab === 'formatka' ? 'bold' : 'normal', background: incidentModalTab === 'formatka' ? '#fff' : '#f0f0f0', border: '1px solid #999', borderBottom: incidentModalTab === 'formatka' ? '1px solid #fff' : '1px solid #999', marginBottom: '-1px', zIndex: incidentModalTab === 'formatka' ? 1 : 0, borderRadius: '3px 3px 0 0' }}
                >Formatka WCPR</button>
                <button 
                  onClick={() => setIncidentModalTab('dziennik')}
                  style={{ padding: '5px 15px', fontWeight: incidentModalTab === 'dziennik' ? 'bold' : 'normal', background: incidentModalTab === 'dziennik' ? '#fff' : '#f0f0f0', border: '1px solid #999', borderBottom: incidentModalTab === 'dziennik' ? '1px solid #fff' : '1px solid #999', marginBottom: '-1px', zIndex: incidentModalTab === 'dziennik' ? 1 : 0, marginLeft: '2px', borderRadius: '3px 3px 0 0' }}
                >Dziennik Działań (Log)</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: incidentModalTab === 'formatka' ? 'block' : 'none' }}>
`;

// Insert the Tabs right before TOP SECTION
if (content.includes(modalTargetStart) && !content.includes("ZAKŁADKI KARTY ZDARZENIA")) {
    content = content.replace(modalTargetStart, modalReplacement);
    
    // Now we need to close the formatka div and add the dziennik div before the bottom buttons
    const buttonsTarget = `{/* Bottom row buttons */}`;
    const buttonsReplacement = `</div>
              
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

              {/* Bottom row buttons */}`;
              
    content = content.replace(buttonsTarget, buttonsReplacement);
}

fs.writeFileSync(file, content);
console.log("Patch modal applied.");
