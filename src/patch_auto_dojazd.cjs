const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = "  // System time clock";
const replacement = `  // --- AUTOMATYCZNY DOJAZD DEMON ---
  useEffect(() => {
    if (!userProfile?.uid) return;
    const interval = setInterval(async () => {
      const now = Date.now();
      const myIncidents = incidents.filter(i => i.ownerId === userProfile.uid && !i.isArchived && i.status !== 'processed');
      
      for (const inc of myIncidents) {
        let changed = false;
        const currentStatuses = { ...(inc.vehicleStatuses || {}) };
        const currentTimes = inc.times || {};
        const radioLogs = [...(inc.radioLogs || [])];
        const statusTimes = { ...(inc.vehicleStatusTimes || {}) };
        const eventHistory = [...(inc.eventHistory || [])];
        
        for (const [vStr, status] of Object.entries(currentStatuses)) {
          if (status === 1) { // Wyjazd
            const stTime = statusTimes[vStr];
            if (stTime) {
              const diffMs = now - new Date(stTime).getTime();
              // 2 minutes = 120000 ms (Let's use 120s)
              if (diffMs > 120000) {
                // Auto arrive!
                currentStatuses[vStr] = 2; // Na miejscu
                statusTimes[vStr] = new Date().toISOString();
                
                const nowStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                if (!currentTimes.arrival) currentTimes.arrival = nowStr;
                
                radioLogs.push({
                  time: nowStr + ':' + new Date().getSeconds().toString().padStart(2, '0'),
                  from: vStr.split(' | ')[1] || vStr,
                  to: "Dyspozytornia",
                  text: \`Zgłaszam status radiowy: NA MIEJSCU (ST 2)\`,
                  channel: "K01 - Kanał Powiatowy",
                  createdAt: new Date().toISOString()
                });
                
                eventHistory.push({
                  time: nowStr,
                  user: "SYSTEM AUTO",
                  action: \`Zastęp \${vStr.split(' | ')[1] || vStr} dojechał na miejsce.\`,
                  createdAt: new Date().toISOString()
                });
                
                changed = true;
              }
            }
          }
        }
        
        if (changed) {
          const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
          try {
            await updateDoc(doc(db, 'incidents', inc.id), {
              vehicleStatuses: currentStatuses,
              vehicleStatusTimes: statusTimes,
              times: currentTimes,
              radioLogs,
              eventHistory,
              updatedAt: serverTimestamp()
            });
          } catch(e) {
            console.error("AutoDojazd Error", e);
          }
        }
      }
    }, 15000); // Check every 15 seconds
    
    return () => clearInterval(interval);
  }, [incidents, userProfile]);

  // System time clock`;

if (content.includes(target) && !content.includes("AUTOMATYCZNY DOJAZD DEMON")) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Auto-Dojazd patch applied.");
} else {
    console.log("Auto-Dojazd target not found or already applied.");
}
