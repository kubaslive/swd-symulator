const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Version Update
code = code.replace(/APP_VERSION = "0\.3\.0 beta"/g, 'APP_VERSION = "0.3.3 beta"');

// 2. Remove AF from generator
code = code.replace(/randomElement\(\["pozar", "mz", "pozar", "mz", "mz", "af"\]\)/g, 'randomElement(["pozar", "mz", "pozar", "mz", "mz"])');

// 3. Manual WCPR button integration
// Search for "⚡ Mistrz Gry (Kreator Zdarzeń)" button and append "Wygeneruj WCPR"
const mgButtonStr = '<button className="btn-win" onClick={() => setActiveMenuTab(\'game_master\')}>⚡ Mistrz Gry (Kreator Zdarzeń)</button>';
const manualBtnStr = `${mgButtonStr}
              <button className="btn-win" onClick={() => window._triggerManualWCPR && window._triggerManualWCPR()}>📞 Wymuś Zgłoszenie WCPR</button>`;
code = code.replace(mgButtonStr, manualBtnStr);

// Link generateAndAddIncident to window
const generateStr = 'const generateAndAddIncident = async () => {';
const generateReplaceStr = `const generateAndAddIncident = async () => {
          if (!window._triggerManualWCPR) window._triggerManualWCPR = generateAndAddIncident;`;
if (code.includes(generateStr) && !code.includes('window._triggerManualWCPR = generateAndAddIncident')) {
    code = code.replace(generateStr, generateReplaceStr);
}

// 4. Distance Calculation Function
const distanceFuncStr = `
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = (lat2-lat1) * (Math.PI/180);
  var dLon = (lon2-lon1) * (Math.PI/180); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}
`;
if (!code.includes('getDistanceFromLatLonInKm')) {
    code = code.replace('import React', distanceFuncStr + '\nimport React');
}

// 5. TenantUnitCoordinates state
if (!code.includes('const [tenantUnitCoordinates, setTenantUnitCoordinates] = useState({});')) {
    code = code.replace('const [tenantVehicles, setTenantVehicles] = useState({});', 'const [tenantVehicles, setTenantVehicles] = useState({});\n  const [tenantUnitCoordinates, setTenantUnitCoordinates] = useState({});');
    code = code.replace('setTenantVehicles(data.vehicles || {});', 'setTenantVehicles(data.vehicles || {});\n        setTenantUnitCoordinates(data.unitCoordinates || {});');
    code = code.replace('setTenantVehicles({});', 'setTenantVehicles({});\n        setTenantUnitCoordinates({});');
    
    // Inject into SisEditor call
    code = code.replace('tenantVehicles={tenantVehicles}', 'tenantVehicles={tenantVehicles}\n              tenantUnitCoordinates={tenantUnitCoordinates}');
}

// 6. Calculate travel time on status 1 (both JRG and OSP) and store expectedArrival
// Need to find where it does `statusNum === 1` and update `activeIncident.vehiclesExpectedArrival`
// Wait, for OSP it happens inside `setTimeout`. For JRG it happens in `handleSetVehicleStatus`.
// Actually, I can just calculate it and store it in `vehicleStatusTimes` as `_expected` or `expectedArrival` field.
// Let's hook into `updateDoc` for `incidents` when `statusNum === 1`.
// We will replace the whole handleSetVehicleStatus logic with a hook... it's simpler to patch the function.

fs.writeFileSync('src/App.jsx', code);
console.log("App.jsx patched 1-5!");
