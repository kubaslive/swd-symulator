const fs = require('fs');

// --- 1. Fix App.jsx colors, WCPR parsing, and Context Menu ---
let app = fs.readFileSync('src/App.jsx', 'utf8');

// Colors
app = app.replace(/#d4d0c8/g, '#f3f3f3');
app = app.replace(/#e0dfde/g, '#ffffff');

// WCPR Parsing
// It was: {call.location?.split('ul. ')[1]?.split(' ')[0] || 'Brak'}
app = app.replace(/call\.location\?\.split\('ul\. '\)\[1\]\?\.split\(' '\)\[0\] \|\| 'Brak'/g, "call.location?.split('ul. ')[1] || call.location || 'Brak'");

// Context Menu Rendering
// We append it right before {isSisEditorOpen && ...}
const contextMenuHTML = `
      {/* Global overlay for context menu */}
      {contextMenu && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
        />
      )}
      
      {contextMenu && (
        <div 
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#f3f3f3',
            border: '1px solid #a0a0a0',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
            zIndex: 99999,
            padding: '2px',
            minWidth: '180px',
            fontSize: '11px',
            color: '#000'
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div 
            className="menu-item" 
            style={{ padding: '4px 20px 4px 5px', cursor: 'pointer' }}
            onClick={() => { 
              setContextMenu(null); 
              setSelectedIncidentId(contextMenu.incidentId);
            }}
          >
            Edytuj Zdarzenie
          </div>
          <div 
            className="menu-item" 
            style={{ padding: '4px 20px 4px 5px', cursor: 'pointer' }}
            onClick={() => { 
              handleFinishIncident(contextMenu.incidentId);
              setContextMenu(null); 
            }}
          >
            ✅ Zakończ Zdarzenie Ratownicze
          </div>
        </div>
      )}

      {isSisEditorOpen`;

app = app.replace('{isSisEditorOpen', contextMenuHTML);

fs.writeFileSync('src/App.jsx', app);


// --- 2. Fix index.css colors and Win10 flat look ---
let css = fs.readFileSync('src/index.css', 'utf8');

// Replace border-radius
css = css.replace(/border-radius:\s*8px/g, 'border-radius: 0px');
css = css.replace(/border-radius:\s*4px/g, 'border-radius: 0px');
css = css.replace(/border-radius:\s*3px/g, 'border-radius: 0px');

// Colors
css = css.replace(/#d4d0c8/g, '#f3f3f3');

fs.writeFileSync('src/index.css', css);

console.log("Fixes applied successfully.");
