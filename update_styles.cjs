const fs = require('fs');

// UPDATE index.css
let css = fs.readFileSync('src/index.css', 'utf8');

const cssModifications = `
.combat-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  border-right: 1px solid var(--win-shadow);
  border-bottom: 1px solid var(--win-shadow);
  background-color: transparent;
  color: #000;
}

.combat-column-title {
  font-size: 11px;
  font-weight: 600;
  color: #000;
  padding: 4px 6px;
  border-bottom: 1px solid #dcdcdc;
  background-color: #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.vehicle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1px 4px;
  cursor: pointer;
  border-bottom: none;
  background-color: transparent;
  transition: none;
}

.vehicle-row:hover {
  background-color: #e0e0e0;
}

.vehicle-row.selected-combat {
  background-color: #0a246a;
  color: #fff;
}

.led-indicator {
  width: 10px;
  height: 10px;
  border-radius: 0;
  display: inline-block;
  border: 1px solid rgba(0,0,0,0.3);
  flex-shrink: 0;
  box-shadow: none !important;
}

.vehicle-name {
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  font-family: Arial, sans-serif;
  padding-left: 2px;
}

.vehicle-obsada {
  font-family: var(--font-mono);
  background-color: transparent;
  border: 1px solid #c0c0c0;
  padding: 0 4px;
  font-size: 10px;
  color: #000;
  flex-shrink: 0;
  min-width: 14px;
  text-align: center;
}
`;

// Append CSS modifications, overriding previous ones.
css += "\n" + cssModifications;
fs.writeFileSync('src/index.css', css);


// UPDATE App.jsx
let app = fs.readFileSync('src/App.jsx', 'utf8');

// Update version
app = app.replace('const APP_VERSION = "0.1.1 beta";', 'const APP_VERSION = "0.2.0 beta";');
app = app.replace('<strong>v0.1.1 beta', '<strong>v0.2.0 beta (Nowy wygląd Tablicy SiS i zabezpieczenie klucza AI)</strong></p><ul><li>Upodobnienie Tablicy SiS (kolumn jednostek) bezpośrednio do rzutu z oryginalnego SWD-ST (kwadratowe ikony, układ tekstu, zmniejszone marginesy).</li><li>Przeniesienie zapisu klucza Gemini API do bezpiecznego localStorage, omijając bazę danych w chmurze.</li></ul><p style={{ marginTop: "10px" }}><strong>v0.1.1 beta');

// Update vehicle row rendering inside App.jsx
// Need to find `const currentState = getVehicleState(uName, v.name);`
const vehicleRowRegex = /<div className="led-indicator[\s\S]*?<\/div>/;
const newLedLogic = `{isCrossedOut ? (
                                <span style={{ color: 'red', fontWeight: 'bold', fontSize: '10px', width: '10px', textAlign: 'center', display: 'inline-block' }}>❌</span>
                              ) : (
                                <div className={\`led-indicator \${
                                  currentState === 'W koszarach' ? 'green' :
                                  (currentState === 'Zadysponowany' || currentState === 'W drodze' || currentState === 'Na miejscu') ? 'red' :
                                  currentState === 'Powrót' ? 'blue' : 'grey'
                                }\`}></div>
                              )}`;
app = app.replace(vehicleRowRegex, newLedLogic);

fs.writeFileSync('src/App.jsx', app);
console.log("Visuals updated!");
