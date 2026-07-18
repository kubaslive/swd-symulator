const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Inject calculating ETA logic
const calcEtaStr = `// Calculate ETA logic
function calculateETA(vStr, incident, tenantUnitCoordinates) {
   let ms = 2 * 60000; // Default 2 min
   const vUnit = vStr.split(' | ')[0];
   const coords = tenantUnitCoordinates?.[vUnit];
   if (coords && coords.lat && coords.lng && incident.lat && incident.lng) {
       const dist = getDistanceFromLatLonInKm(parseFloat(incident.lat), parseFloat(incident.lng), parseFloat(coords.lat), parseFloat(coords.lng));
       // city speed 45 km/h -> 45km / 60min = 0.75 km/min -> dist / 0.75 = mins
       let mins = dist / 0.75;
       if (mins < 1) mins = 1;
       if (mins > 30) mins = 30;
       ms = Math.floor(mins * 60000);
   }
   return Date.now() + ms;
}
`;

if (!code.includes('calculateETA')) {
    code = code.replace('const handleSetVehicleStatus = async (vStr, statusNum) => {', calcEtaStr + '\n  const handleSetVehicleStatus = async (vStr, statusNum) => {');
}

// Intercept Status 2 check
const status2Check = `    if (statusNum === 2) {
      const expectedArrival = activeIncident.vehiclesExpectedArrival?.[vStr];
      if (expectedArrival && Date.now() < expectedArrival) {
        const remainingMs = expectedArrival - Date.now();
        const mins = Math.ceil(remainingMs / 60000);
        alert(\`Zastęp \${vStr} jest jeszcze w drodze! Szacowany czas dojazdu to około \${mins} minut(y).\`);
        return;
      }
    }
`;
if (!code.includes('vehiclesExpectedArrival')) {
    code = code.replace('const currentStatuses = activeIncident.vehicleStatuses || {};', status2Check + '\n    const currentStatuses = activeIncident.vehicleStatuses || {};');
}

// Modify Status 1 logic for NON-OSP to calculate expected arrival
const jrgStatus1Find = `    const updatedStatuses = { ...currentStatuses, [vStr]: statusNum };
    const updatedStatusTimes = { ...activeIncident.vehicleStatusTimes, [vStr]: new Date().toISOString() };`;
    
const jrgStatus1Replace = `    const updatedStatuses = { ...currentStatuses, [vStr]: statusNum };
    const updatedStatusTimes = { ...activeIncident.vehicleStatusTimes, [vStr]: new Date().toISOString() };
    const updatedExpectedArrival = { ...(activeIncident.vehiclesExpectedArrival || {}) };
    if (statusNum === 1) {
      updatedExpectedArrival[vStr] = calculateETA(vStr, activeIncident, tenantUnitCoordinates);
    }`;

if (code.includes(jrgStatus1Find)) {
    code = code.replace(jrgStatus1Find, jrgStatus1Replace);
    code = code.replace('vehicleStatusTimes: updatedStatusTimes,', 'vehicleStatusTimes: updatedStatusTimes,\n        vehiclesExpectedArrival: updatedExpectedArrival,');
}

// Modify OSP logic inside setTimeout
const ospTimeoutFind = `             const currentTimes = freshInc.times || {};`;
const ospTimeoutReplace = `             const currentTimes = freshInc.times || {};
             const freshExpected = freshInc.vehiclesExpectedArrival || {};
             const finalExpected = { ...freshExpected, [vStr]: calculateETA(vStr, freshInc, tenantUnitCoordinates) };`;

if (code.includes(ospTimeoutFind)) {
    code = code.replace(ospTimeoutFind, ospTimeoutReplace);
    code = code.replace('vehicleStatusTimes: finalTimes,', 'vehicleStatusTimes: finalTimes,\n                vehiclesExpectedArrival: finalExpected,');
}


// Fix Komenda in table
code = code.replace('<td>KM/KP PSP</td>', '<td>{incident.tenantId === "Bedzin" ? "KP PSP Będzin" : (incident.tenantId ? `KM PSP ${incident.tenantId}` : "KM PSP")}</td>');

// Fix JRG Odbiorca in table - we will dynamically assign JRG 1/2/3 based on targetJrg or location
const targetJrgLogic = `                          <td>{incident.targetJrg ? incident.targetJrg : '---'}</td>`;
const targetJrgReplace = `                          <td>{incident.targetJrg ? incident.targetJrg : (incident.location?.includes('Szopienice') || incident.location?.includes('Zawodzie') ? 'JRG 3' : (incident.location?.includes('Piotrowice') || incident.location?.includes('Ligota') ? 'JRG 2' : 'JRG 1'))}</td>`;
code = code.replace(targetJrgLogic, targetJrgReplace);


fs.writeFileSync('src/App.jsx', code);
console.log("App.jsx patched part 2!");
