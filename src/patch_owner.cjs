const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. In handleSetVehicleStatus
const targetStatus = "    if (statusNum > 1 && activeIncident.tenantId !== userProfile?.tenantId && userProfile?.role !== 'admin') {";
const replacementStatus = `    // LOCKING: Prevent other users from trolling your incident
    if (activeIncident.ownerId && activeIncident.ownerId !== userProfile?.uid && userProfile?.role !== 'admin') {
      alert('🔒 To zdarzenie jest zablokowane, ponieważ zostało podjęte przez innego dyspozytora. Nie możesz zmieniać statusów pojazdów!');
      return;
    }
    
    if (statusNum > 1 && activeIncident.tenantId !== userProfile?.tenantId && userProfile?.role !== 'admin') {`;

if (content.includes(targetStatus) && !content.includes("To zdarzenie jest zablokowane, ponieważ")) {
  content = content.replace(targetStatus, replacementStatus);
}

// 2. Take Over Button
const targetTakeover = "{/* Dyspozycje Toolbar */}";
const replacementTakeover = `{/* Dyspozycje Toolbar */}
                    {activeIncident?.ownerId && activeIncident.ownerId !== userProfile?.uid && (
                      <div style={{ padding: '4px', background: '#ffe3e3', borderBottom: '1px solid #ff8787', fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🔒 <b>Zdarzenie Zablokowane</b> (prowadzi: inny dyspozytor)</span>
                        <button className="btn-win" style={{ padding: '2px 5px', color: 'red', fontWeight: 'bold' }} onClick={async () => {
                           if(window.confirm('Czy na pewno chcesz siłowo przejąć to zdarzenie? Zrób to tylko, jeśli poprzedni dyspozytor jest AFK.')) {
                             const { updateDoc, doc } = await import('firebase/firestore');
                             await updateDoc(doc(db, 'incidents', activeIncident.id), { ownerId: userProfile.uid });
                             alert('Przejąłeś dowodzenie nad zdarzeniem.');
                           }
                        }}>Przejmij Zdarzenie</button>
                      </div>
                    )}`;

if (content.includes(targetTakeover) && !content.includes("Zdarzenie Zablokowane")) {
  content = content.replace(targetTakeover, replacementTakeover);
}

fs.writeFileSync(file, content);
console.log("OwnerId patch applied.");
