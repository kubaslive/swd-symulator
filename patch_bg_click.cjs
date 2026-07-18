const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Incidents Table Background Click
// Find: <div className="incident-table-container" style={{ flex: 1 }}>
const incContainerStr = '<div className="incident-table-container" style={{ flex: 1 }}>';
const incContainerNewStr = '<div className="incident-table-container" style={{ flex: 1 }} onClick={() => setSelectedIncidentId(null)}>';
app = app.replace(incContainerStr, incContainerNewStr);

// Also stop propagation on rows
const incRowStr = `onClick={() => setSelectedIncidentId(incident.id)}`;
const incRowNewStr = `onClick={(e) => { e.stopPropagation(); setSelectedIncidentId(incident.id); }}`;
app = app.replace(incRowStr, incRowNewStr);
// replace multiple occurrences if any
app = app.replaceAll(incRowStr, incRowNewStr);

// 2. SiS Table Background Click (for vehicles)
// The right panel is usually "right-sidebar" or similar.
// In the right sidebar: <div style={{ border: '2px inset #d1d1d1', padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1, background: '#fff' }}>
// And selectedSisVehicle / selectedCombatVehicle.
// Let's just find the main area and add a global click handler or something, or just the table.
// Better: find `onClick={() => setSelectedSisVehicle(vStr)}` and stop propagation.
const sisRowStr = `onClick={() => setSelectedSisVehicle(vStr)}`;
const sisRowNewStr = `onClick={(e) => { e.stopPropagation(); setSelectedSisVehicle(vStr); }}`;
app = app.replaceAll(sisRowStr, sisRowNewStr);

// Let's add onClick={() => setSelectedSisVehicle(null)} to the container.
// It is in renderSiSPane or renderCombatPane
const combatPaneStr = `<div className="right-sidebar"`;
const combatPaneNewStr = `<div className="right-sidebar" onClick={() => { setSelectedCombatVehicle(null); setSelectedSisVehicle(null); }}`;
app = app.replaceAll(combatPaneStr, combatPaneNewStr);

// For combat vehicle:
const cvRowStr = `onClick={() => setSelectedCombatVehicle(\`\${actualUName} | \${v.name}\`)}`;
const cvRowNewStr = `onClick={(e) => { e.stopPropagation(); setSelectedCombatVehicle(\`\${actualUName} | \${v.name}\`); }}`;
app = app.replaceAll(cvRowStr, cvRowNewStr);

// OSP combat vehicle:
const ospCvRowStr = `onClick={() => setSelectedCombatVehicle(\`\${osp} | \${v.name}\`)}`;
const ospCvRowNewStr = `onClick={(e) => { e.stopPropagation(); setSelectedCombatVehicle(\`\${osp} | \${v.name}\`); }}`;
app = app.replaceAll(ospCvRowStr, ospCvRowNewStr);

fs.writeFileSync('src/App.jsx', app);
console.log("App.jsx patched with bg clicks successfully!");
