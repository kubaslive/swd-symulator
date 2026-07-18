const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add incidentContextMenu state
if (!app.includes('const [incidentContextMenu, setIncidentContextMenu] = useState(null);')) {
  app = app.replace('const [vehicleContextMenu, setVehicleContextMenu] = useState(null);', 'const [vehicleContextMenu, setVehicleContextMenu] = useState(null);\n  const [incidentContextMenu, setIncidentContextMenu] = useState(null);');
}

// 2. Add incidentContextMenu rendering
const incidentContextMenuStr = `{/* Global overlay for INCIDENT context menu */}
        {incidentContextMenu && (
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
            onClick={() => setIncidentContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setIncidentContextMenu(null); }}
          >
            <div 
              className="win-context-menu"
              style={{ top: incidentContextMenu.y, left: incidentContextMenu.x }}
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => {
                setSelectedIncidentId(incidentContextMenu.id);
                setIncidentContextMenu(null);
              }}>📄 Otwórz Kartę Zdarzenia</button>
              <div className="separator"></div>
              {userProfile?.role === 'admin' && (
                <button onClick={() => {
                  deleteDoc(doc(db, 'incidents', incidentContextMenu.id));
                  setIncidentContextMenu(null);
                }}>❌ Usuń trwale (Admin)</button>
              )}
            </div>
          </div>
        )}`;

if (!app.includes('incidentContextMenu &&')) {
  app = app.replace('{/* Global overlay for context menu */}', incidentContextMenuStr + '\n        {/* Global overlay for VEHICLE context menu */}');
}

// 3. Apply .win-context-menu to Vehicle Menu
const oldVehicleMenuStart = `<div 
              style={{
                position: 'absolute',
                top: vehicleContextMenu.y,
                left: vehicleContextMenu.x,
                background: '#f3f3f3',
                border: '1.5px solid #d1d1d1',
                boxShadow: '2px 2px 5px rgba(0,0,0,0.5)',
                padding: '2px',
                display: 'flex',
                flexDirection: 'column',
                minWidth: '150px',
                zIndex: 100000
              }}
              onClick={e => e.stopPropagation()}
            >`;
const newVehicleMenuStart = `<div 
              className="win-context-menu"
              style={{
                top: vehicleContextMenu.y,
                left: vehicleContextMenu.x
              }}
              onClick={e => e.stopPropagation()}
            >`;
app = app.replace(oldVehicleMenuStart, newVehicleMenuStart);

// 4. Update the active incidents table styling
app = app.replace('<table className="swd-table">', '<table className="swd-table-dark">');

// 5. Update rows with dynamic classes
const oldTrMap = `<tr 
                            key={incident.id} 
                            onClick={() => setSelectedIncidentId(incident.id)}
                            onDoubleClick={() => setSelectedIncidentId(incident.id)}
                            style={{ 
                              background: rowBg, 
                              color: isSelected ? '#ffffff' : '#000000',
                              cursor: 'pointer',
                              borderBottom: '1px solid #d1d1d1'
                            }}
                          >`;
const newTrMap = `<tr 
                            key={incident.id} 
                            onClick={() => setSelectedIncidentId(incident.id)}
                            onDoubleClick={() => setSelectedIncidentId(incident.id)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setIncidentContextMenu({ x: e.clientX, y: e.clientY, id: incident.id });
                            }}
                            className={\`\${isSelected ? 'selected' : ''} \${incident.type === 'pozar' ? 'row-pozar' : incident.type === 'mz' ? 'row-mz' : 'row-inna'}\`}
                            style={{ cursor: 'pointer' }}
                          >`;
app = app.replace(oldTrMap, newTrMap);

fs.writeFileSync('src/App.jsx', app);
console.log("App.jsx patched successfully!");
