const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = "<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>";
const replacement = `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* BEZPIECZEŃSTWO I PIELĘGNACJA BAZY */}
          <div style={{ background: '#fff', border: '1px solid #ccc', padding: '12px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
             <h3 style={{ fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>🛡️ Pielęgnacja Bazy Danych</h3>
             <p style={{ fontSize: '11px', marginTop: '5px' }}>Narzędzia administratorskie do usuwania martwych dusz i starych zgłoszeń, zapobiegające zapychaniu bazy.</p>
             <button className="btn-win" style={{ padding: '6px 12px', color: 'red', fontWeight: 'bold', marginTop: '10px' }} onClick={async () => {
              if (window.confirm("Czy na pewno chcesz trwale usunąć wszystkie zdarzenia starsze niż 48 godzin? To zwolni miejsce w buforze Firebase!")) {
                 try {
                   const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
                   const snap = await getDocs(collection(db, 'incidents'));
                   let count = 0;
                   const now = Date.now();
                   snap.forEach(docSnap => {
                     const data = docSnap.data();
                     const cAt = data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : new Date(data.createdAt).getTime()) : 0;
                     if (cAt && (now - cAt > 48 * 60 * 60 * 1000)) {
                       deleteDoc(doc(db, 'incidents', docSnap.id));
                       count++;
                     }
                   });
                   alert(\`Wyczyszczono \${count} przestarzałych zdarzeń z bazy.\`);
                 } catch(e) {
                   alert("Błąd: " + e.message);
                 }
              }
            }}>🧹 Usuń zdarzenia starsze niż 48h (Purge)</button>
          </div>
`;

if (content.includes(target) && !content.includes("Pielęgnacja Bazy Danych")) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Admin purge patch applied.");
} else {
    console.log("Admin purge target not found or already applied.");
}
