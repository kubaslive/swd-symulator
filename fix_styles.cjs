const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// For normal vehicles, if state === "Na zabezpieczeniu", make it gray.
// We have this block in multiple places:
// <span className={`vehicle-name ${isCrossedOut ? 'crossed-out' : ''}`} style={{ fontSize: '10px' }}>
// We can replace it with:
// <span className={`vehicle-name ${isCrossedOut ? 'crossed-out' : ''}`} style={{ fontSize: '10px', color: currentState === 'Na zabezpieczeniu' ? '#888' : 'inherit' }}>

// Replace in PSP
code = code.replace(
  `const isCrossedOut = getVehicleState(actualUName, v.name) === "Wycofany" || v.outOfService;
                        const currentState = getVehicleState(actualUName, v.name);
                        return (`,
  `const isCrossedOut = getVehicleState(actualUName, v.name) === "Wycofany" || v.outOfService;
                        const currentState = getVehicleState(actualUName, v.name);
                        return (`
);

code = code.replaceAll(
  `<span className={\`vehicle-name \${isCrossedOut ? 'crossed-out' : ''}\`} style={{ fontSize: '10px' }}>`,
  `<span className={\`vehicle-name \${isCrossedOut ? 'crossed-out' : ''}\`} style={{ fontSize: '10px', color: getVehicleState(actualUName, v.name) === 'Na zabezpieczeniu' ? '#888' : 'inherit' }}>`
);

// For guestVehicles, make them bold black
code = code.replace(
  `style={{ fontStyle: 'italic', background: '#e9ecef', border: '1px dashed #adb5bd' }}`,
  `style={{ fontWeight: 'bold', color: '#000', background: '#e9ecef', border: '1px dashed #adb5bd' }}`
);

fs.writeFileSync('src/App.jsx', code);
