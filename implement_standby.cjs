const fs = require('fs');

// 1. UPDATE index.css
let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('.led-indicator.standby')) {
  const cssAddition = `
.led-indicator.standby {
  background: linear-gradient(135deg, #00c800 50%, #ffff00 50%);
  box-shadow: none !important;
}
`;
  css += cssAddition;
  fs.writeFileSync('src/index.css', css);
}

// 2. UPDATE App.jsx
let app = fs.readFileSync('src/App.jsx', 'utf8');

// A. Inject toggleVehicleStandby near toggleVehicleOutOfService
const oosRegex = /const toggleVehicleOutOfService = async \(unitName, vehicleName\) => \{([\s\S]*?)\n  \};/;
const standbyFunc = `const toggleVehicleStandby = async (unitName, vehicleName) => {
    try {
      const updatedVehicles = { ...tenantVehicles };
      if (!updatedVehicles[unitName]) return;
      const vIndex = updatedVehicles[unitName].findIndex(v => v.name === vehicleName);
      if (vIndex !== -1) {
        updatedVehicles[unitName][vIndex].isStandby = !updatedVehicles[unitName][vIndex].isStandby;
        
        await updateDoc(doc(db, 'tenantSettings', 'default'), { vehicles: updatedVehicles });
        logAction(\`[\${unitName}] Pojazd \${vehicleName} \${updatedVehicles[unitName][vIndex].isStandby ? 'postawiony w Stan Gotowości (PZR)' : 'wycofany ze Stanu Gotowości'}.\`);
      }
    } catch (err) {
      console.error("Błąd zapisywania gotowości pojazdu:", err);
    }
  };`;
app = app.replace(oosRegex, (match) => match + '\n\n  ' + standbyFunc);

// B. Context menu modifications
// vehicleContextMenu state already tracks uName, vName, isOos. Let's add isStandby to it.
const ctxSetRegex = /setVehicleContextMenu\(\{([\s\S]*?)isOos: v.outOfService,([\s\S]*?)activeIncId: activeInc\?.id/g;
app = app.replace(ctxSetRegex, `setVehicleContextMenu({\n$1isOos: v.outOfService,\n$2isStandby: v.isStandby,\n$2activeIncId: activeInc?.id`);

// Add standby buttons to context menu
// Find the else branch of vehicleContextMenu.activeIncId
const ctxButtonsRegex = /<button className="menu-item" style=\{\{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' \}\} onClick=\{\(\) => \{\n\s*toggleVehicleOutOfService\(vehicleContextMenu\.uName, vehicleContextMenu\.vName\);\n\s*setVehicleContextMenu\(null\);\n\s*\}\}>\n\s*\{vehicleContextMenu\.isOos \? '✅ Przywróć do podziału' : '⛔ Wycofaj z podziału \(OOS\)'\}\n\s*<\/button>/;

const standbyButtons = `<button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                    toggleVehicleOutOfService(vehicleContextMenu.uName, vehicleContextMenu.vName);
                    setVehicleContextMenu(null);
                  }}>
                    {vehicleContextMenu.isOos ? '✅ Przywróć do podziału' : '⛔ Wycofaj z podziału (OOS)'}
                  </button>
                  {(!vehicleContextMenu.uName.includes('JRG') && !vehicleContextMenu.uName.includes('KM/KP')) && (
                    <button className="menu-item" style={{ textAlign: 'left', fontSize: '11px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                      toggleVehicleStandby(vehicleContextMenu.uName, vehicleContextMenu.vName);
                      setVehicleContextMenu(null);
                    }}>
                      {vehicleContextMenu.isStandby ? '🟩 Anuluj gotowość bojową' : '🟨 Postaw w stan gotowości'}
                    </button>
                  )}`;
app = app.replace(ctxButtonsRegex, standbyButtons);

// C. Update renderTable4StatusIcon for standby state
const iconRegex = /\(currentState === 'Zadysponowany' \|\| currentState === 'W drodze' \|\| currentState === 'Na miejscu'\) \? 'red' :\n\s*currentState === 'Powrót' \? 'blue' : 'grey'/;
const iconReplacement = `v.isStandby ? 'standby' : (currentState === 'Zadysponowany' || currentState === 'W drodze' || currentState === 'Na miejscu') ? 'red' : currentState === 'Powrót' ? 'blue' : 'grey'`;
app = app.replace(iconRegex, iconReplacement);

// D. Modify renderCombatBoard logic to move standby vehicles
// We find where vehicles are pulled for a column:
// const vehicles = UNIT_VEHICLES[uName] || [];
// And we modify this array based on standby.

const vehiclesPullRegex = /const vehicles = UNIT_VEHICLES\[uName\] \|\| \[\];/;
const vehiclesPullReplacement = `let vehicles = UNIT_VEHICLES[uName] || [];

                // STAN GOTOWOSCI (PZR): If this is KM/KP PSP, inject all OSP standby vehicles!
                if (uName.includes('KM/KP')) {
                  Object.keys(UNIT_VEHICLES).forEach(ospUnit => {
                    if (!ospUnit.includes('JRG') && !ospUnit.includes('KM/KP')) {
                      const standbyVehs = (UNIT_VEHICLES[ospUnit] || []).filter(v => v.isStandby).map(v => ({...v, originalUnit: ospUnit}));
                      vehicles = [...vehicles, ...standbyVehs];
                    }
                  });
                } else if (!uName.includes('JRG') && !uName.includes('KM/KP')) {
                  // For normal OSP columns, filter out the ones that are on standby
                  vehicles = vehicles.filter(v => !v.isStandby);
                }`;
app = app.replace(vehiclesPullRegex, vehiclesPullReplacement);

// Fix onClick and onDoubleClick for injected vehicles to use their original unit name!
// Currently it uses `uName` everywhere in the mapped div. We need `const actualUName = v.originalUnit || uName;` inside the vehicle loop!
const mapStartRegex = /\{vehicles\.map\(v => \{([\s\S]*?)const isCrossedOut = getVehicleState\(uName, v\.name\)/;
app = app.replace(mapStartRegex, `{vehicles.map(v => {\n                        const actualUName = v.originalUnit || uName;\n                        const isCrossedOut = getVehicleState(actualUName, v.name)`);

// Replace all usages of `uName` inside the vehicle loop with `actualUName`
// Since regex is hard for nested blocks, let's do a targeted replace between map and return
const loopBlockRegex = /\{vehicles\.map\(v => \{([\s\S]*?)return \(\n\s*<div\s*key=\{v\.name\}/;
app = app.replace(loopBlockRegex, (match) => {
  return match.replace(/getVehicleState\(uName/g, 'getVehicleState(actualUName');
});

// Replace `uName` with `actualUName` inside the returned JSX of vehicle map
const rowJsxRegex = /return \(\n\s*<div\s*key=\{v\.name\}[\s\S]*?<\/div>\n\s*\);\n\s*\}\)/;
app = app.replace(rowJsxRegex, (match) => {
  return match
    .replace(/selectedCombatVehicle === \`\$\{uName\} \|/g, 'selectedCombatVehicle === `${actualUName} |')
    .replace(/v\.name\}\ \(\$\{uName\}\)/g, 'v.name} (${actualUName})')
    .replace(/setSelectedCombatVehicle\(\`\$\{uName\} \|/g, 'setSelectedCombatVehicle(`${actualUName} |')
    .replace(/const vStr = \`\$\{uName\} \| \$\{v\.name\}\`;/g, 'const vStr = `${actualUName} | ${v.name}`;')
    .replace(/inc\.vehicles\?\.includes\(\`\$\{uName\} \| \$\{v\.name\}\`\)/g, 'inc.vehicles?.includes(`${actualUName} | ${v.name}`)')
    .replace(/uName,/g, 'uName: actualUName,')
    .replace(/renderTable4StatusIcon\(uName/g, 'renderTable4StatusIcon(actualUName');
});


fs.writeFileSync('src/App.jsx', app);
console.log("Implementation completed!");
