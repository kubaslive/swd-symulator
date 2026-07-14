const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf-8');

const newLogic = `
      // --- Custom Updates Escalation Logic ---
      if (incident.updates && Array.isArray(incident.updates)) {
        const processed = incident.processedUpdates || 0;
        if (processed < incident.updates.length) {
          const nextUpdate = incident.updates[processed];
          let startTime = incident.createdAt?.seconds ? incident.createdAt.seconds * 1000 : (incident.createdAt ? new Date(incident.createdAt).getTime() : Date.now());
          if (incident.times?.alarm) startTime = new Date(incident.times.alarm).getTime();
          
          const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
          if (elapsedSecs >= nextUpdate.delay) {
            const newRadioLog = {
              time: new Date().toLocaleTimeString('pl-PL'),
              from: 'KDR',
              to: 'SKKP',
              text: "[ESKALACJA] " + nextUpdate.msg,
              read: false
            };
            const radioLogs = incident.radioLogs || [];
            const updatePayload = {
              processedUpdates: processed + 1,
              radioLogs: [...radioLogs, newRadioLog],
              updatedAt: serverTimestamp()
            };
            if (nextUpdate.requiredUnits) {
               updatePayload.requiredUnits = nextUpdate.requiredUnits;
               updatePayload.kdrRequestPending = true; // Block closing until satisfied
               updatePayload.description = (incident.description || '') + "\\n\\n[ZMIANA WYMOGÓW TAKTYCZNYCH]: KDR poprosił o zadysponowanie: " + JSON.stringify(nextUpdate.requiredUnits);
            }
            try {
              updateDoc(doc(db, 'incidents', incident.id), updatePayload);
            } catch(e) {}
          }
        }
      }
      
      // --- Dynamic Incident Mutation Logic ---
`;

content = content.replace('// --- Dynamic Incident Mutation Logic ---', newLogic);
fs.writeFileSync('src/App.jsx', content);
