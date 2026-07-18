const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// I need to add lastSgrReminder and sgrFulfilled to the updateDoc payload
const target = `            await updateDoc(doc(db, 'incidents', inc.id), {
              vehicleStatuses: currentStatuses,
              vehicleStatusTimes: statusTimes,
              times: currentTimes,
              radioLogs: radioLogs,
              eventHistory: eventHistory
            });`;

const replace = `            const payload = {
              vehicleStatuses: currentStatuses,
              vehicleStatusTimes: statusTimes,
              times: currentTimes,
              radioLogs: radioLogs,
              eventHistory: eventHistory
            };
            if (inc.lastSgrReminder !== undefined) payload.lastSgrReminder = inc.lastSgrReminder;
            if (inc.sgrFulfilled !== undefined) payload.sgrFulfilled = inc.sgrFulfilled;
            await updateDoc(doc(db, 'incidents', inc.id), payload);`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.jsx', code);
