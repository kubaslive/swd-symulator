const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

const oldStart = '  // Helper to render high-fidelity Table 4 status icons (Page 24/57)';
const oldEnd = '  const renderJrgBoard = () => {';

const newFn = `
  // Helper to render high-fidelity Table 4 status icons (Page 24/57)
  const renderTable4StatusIcon = (unitName, vehicleName, customState = null) => {
    const state = customState || getVehicleState(unitName, vehicleName);
    
    // According to SWD-ST 2.5:
    // Green circle: Available (W koszarach)
    // Red square: Dispatched/In Action (Zadysponowany, W drodze, Na miejscu)
    // Blue square with X: Out of service (Wycofany)
    // Red double down arrow: Returning (Powrót)
    
    if (state === "W koszarach") {
      return (
        <svg width="10" height="10" style={{ marginRight: '6px' }} title="W koszarach">
          <circle cx="5" cy="5" r="4.5" fill="#5cb85c" stroke="#333" strokeWidth="0.5" />
        </svg>
      );
    }
    
    if (state === "Wycofany") {
      return (
        <div style={{ width: '10px', height: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0275d8', border: '1px solid #000', marginRight: '6px' }} title="Wycofany/Niedostępny">
          <span style={{ color: '#fff', fontSize: '8px', fontWeight: 'bold' }}>✖</span>
        </div>
      );
    }

    if (state === "Powrót") {
      return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '10px', height: '10px', marginRight: '6px' }} title="Powrót">
          <span style={{ color: '#d9534f', fontSize: '8px', lineHeight: '0.8', fontWeight: 'bold' }}>▼</span>
          <span style={{ color: '#d9534f', fontSize: '8px', lineHeight: '0.8', fontWeight: 'bold' }}>▼</span>
        </div>
      );
    }

    // Default to Red Square for Active (Zadysponowany, W drodze, Na miejscu, etc.)
    return (
      <div style={{ width: '10px', height: '10px', backgroundColor: '#d9534f', border: '1px solid #000', display: 'inline-block', marginRight: '6px' }} title={state}></div>
    );
  };

`;

const startIndex = code.indexOf(oldStart);
const endIndex = code.indexOf(oldEnd);

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newFn + code.substring(endIndex);
}

fs.writeFileSync('src/App.jsx', code);
console.log("Icons patched");
