const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const target1 = `if (!window._triggerManualWCPR) window._triggerManualWCPR = generateAndAddIncident;`;
code = code.replace(target1, "");

const target2 = `        generateAndAddIncident();
        window.triggerGen = generateAndAddIncident;`;
const replacement2 = `        generateAndAddIncident();
      }
      
      // EXPORT FOR MANUAL BUTTON
      window._triggerManualWCPR = async () => {
        const callerName = \`\${randomElement(firstNames)} \${randomElement(lastNames)}\`;
        const phone = \`\${Math.floor(500 + Math.random() * 200)}-\${Math.floor(100 + Math.random() * 800)}-\${Math.floor(100 + Math.random() * 800)}\`;
        const type = randomElement(["pozar", "mz", "pozar", "mz", "mz"]);
        const dynamicScenarios = dbScenarios.filter(s => s.type === type);
        const offlineScenarios = DEFAULT_SCENARIOS.filter(s => s.type === type);
        const scenarioObj = (dynamicScenarios.length > 0 && Math.random() > 0.4) ? randomElement(dynamicScenarios) : randomElement(offlineScenarios);
        
        let street = activeStreets && activeStreets.length > 0 ? randomElement(activeStreets) : "Główna";
        const houseNum = Math.floor(Math.random() * 150) + 1;
        let location = \`\${city}, ul. \${street} \${houseNum}\`;
        
        try {
            await addDoc(collection(db, 'calls'), {
              tenantId: userProfile?.tenantId || 'brak',
              type: scenarioObj.reportedType || type,
              category: scenarioObj.reportedType || type,
              status: 'pending',
              location: location,
              address: location,
              gminaStr: \`Gmina m. \${city}\`,
              miejscowoscStr: city,
              description: scenarioObj.text || "Zgłoszenie z formatki WCPR",
              callerName: callerName,
              phone: \`+48 \${phone}\`,
              expectedKdrMsg: scenarioObj.expectedKdrMsg || "",
              requiredUnits: scenarioObj.requiredUnits || null,
              updates: scenarioObj.updates || [],
              processedUpdates: 0,
              needsZRM: !!scenarioObj.zrm,
              needsPolice: !!scenarioObj.pol,
              createdAt: serverTimestamp()
            });
            logAction(\`🚨 Gra: Wymuszono nowe połączenie 112!\`);
        } catch(e) { console.error(e); }
      };`;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/App.jsx', code);
