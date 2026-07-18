const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Context Menu Button Fix
const ctxMenuSearch = `              <button onClick={() => {
                setSelectedIncidentId(incidentContextMenu.id);
                setIncidentContextMenu(null);
              }}>📄 Otwórz Kartę Zdarzenia</button>`;
const ctxMenuReplace = `              <button onClick={() => {
                setSelectedIncidentId(incidentContextMenu.id);
                setIsNewIncidentModalOpen(true);
                setIncidentContextMenu(null);
              }}>📄 Otwórz Kartę Zdarzenia</button>`;
app = app.replace(ctxMenuSearch, ctxMenuReplace);

// 2. Row Double Click Fix
const dbClickSearch = `onDoubleClick={() => setSelectedIncidentId(incident.id)}`;
const dbClickReplace = `onDoubleClick={() => { setSelectedIncidentId(incident.id); setIsNewIncidentModalOpen(true); }}`;
app = app.replaceAll(dbClickSearch, dbClickReplace);

fs.writeFileSync('src/App.jsx', app);
console.log("App.jsx patched for modal open successfully!");
