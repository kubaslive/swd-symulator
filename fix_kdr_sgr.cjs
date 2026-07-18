const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const targetLoop = `        for (const [vStr, status] of Object.entries(currentStatuses)) {
          if (status === 1) { // Wyjazd`;

const replaceLoop = `        let hasSgrOnSite = false;
        
        for (const [vStr, status] of Object.entries(currentStatuses)) {
          // Check SGR fulfillment if vehicle is on site (status >= 2 && status <= 4)
          if ((status === 2 || status === 3 || status === 4) && inc.requiredSgr) {
            const parts = vStr.split(' | ');
            if (parts.length === 2 && tenantVehicles && tenantVehicles[parts[0]]) {
              const veh = tenantVehicles[parts[0]].find(v => v.name === parts[1]);
              if (veh && veh.sgr === inc.requiredSgr) {
                hasSgrOnSite = true;
              }
            }
          }
          
          if (status === 1) { // Wyjazd`;

code = code.replace(targetLoop, replaceLoop);

const targetPostLoop = `        if (changed) {
          const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');`;

const replacePostLoop = `        // SGR reminder logic
        if (inc.requiredSgr && !hasSgrOnSite && Object.values(currentStatuses).some(s => s >= 2)) {
          // At least one vehicle is on site, but no SGR.
          // Let's remind every 2 minutes. We can use the last event history time to throttle, 
          // or add a property 'lastSgrReminder'.
          const lastReminder = inc.lastSgrReminder || 0;
          if (now - lastReminder > 120000) {
            inc.lastSgrReminder = now;
            const nowStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            
            const kdrVeh = Object.entries(currentStatuses).find(([v, s]) => s >= 2)?.[0] || 'KDR';
            
            radioLogs.push({
              time: nowStr + ':' + new Date().getSeconds().toString().padStart(2, '0'),
              from: kdrVeh.split(' | ')[1] || kdrVeh,
              to: "Dyspozytornia",
              text: \`Sytuacja skomplikowana. Pilnie potrzebujemy na miejscu Grupy Specjalistycznej \${inc.requiredSgr}!\`,
              channel: "K01 - Kanał Powiatowy",
              createdAt: new Date().toISOString()
            });
            
            eventHistory.push({
              time: nowStr,
              user: "KDR",
              action: \`Zgłoszono zapotrzebowanie na \${inc.requiredSgr}.\`,
              createdAt: new Date().toISOString()
            });
            changed = true;
          }
        }
        
        // Auto-fulfill SGR if it just arrived
        if (inc.requiredSgr && hasSgrOnSite && !inc.sgrFulfilled) {
           inc.sgrFulfilled = true;
           const nowStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
           eventHistory.push({
              time: nowStr,
              user: "SYSTEM",
              action: \`Wymóg \${inc.requiredSgr} został spełniony.\`,
              createdAt: new Date().toISOString()
           });
           changed = true;
        }

        if (changed) {
          const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');`;

code = code.replace(targetPostLoop, replacePostLoop);

fs.writeFileSync('src/App.jsx', code);
