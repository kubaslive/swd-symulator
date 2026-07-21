const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Move window._triggerManualWCPR outside of the useEffect's inner if-block so it is always defined
// Replace the entire window._triggerManualWCPR definition with a global assignment outside the hook
// Wait, the easiest way is to just define it directly in the component body, but we need it to not trigger re-renders.
// Since it's attached to window, we can just define it unconditionally inside the useEffect.

// Find:
/*
      // EXPORT FOR MANUAL BUTTON
      window._triggerManualWCPR = async () => {
        ...
        } catch(e) { console.error(e); }
      };
    }

  }, [activeRole, incidents, isGameModeActive, incomingCalls, lastGameIncidentTime, gameModeCities, dbScenarios, animationTick]);
*/
const triggerRegex = /\/\/ EXPORT FOR MANUAL BUTTON[\s\S]*?window\._triggerManualWCPR = async \(\) => \{[\s\S]*?\} catch\(e\) \{ console\.error\(e\); \}\n\s*\};\n\s*\}/;

content = content.replace(triggerRegex, `} // Close the dyzurny_sk block
      
    // EXPORT FOR MANUAL BUTTON (Now outside the dyzurny_sk check, available to all roles)
    window._triggerManualWCPR = async () => {
      const callerName = \`\${randomElement(firstNames)} \${randomElement(lastNames)}\`;
      const phone = \`\${Math.floor(500 + Math.random() * 200)}-\${Math.floor(100 + Math.random() * 800)}-\${Math.floor(100 + Math.random() * 800)}\`;
      const type = randomElement(["pozar", "mz", "pozar", "mz", "mz"]);
      const dynamicScenarios = dbScenarios.filter(s => s.type === type);
      const offlineScenarios = DEFAULT_SCENARIOS.filter(s => s.type === type);
      const scenarioObj = (dynamicScenarios.length > 0 && Math.random() > 0.4) ? randomElement(dynamicScenarios) : randomElement(offlineScenarios);
      
      const city = gameModeCities.length > 0 ? randomElement(gameModeCities) : "Katowice";
      const activeStreets = STREETS[city] || [];
      const streetObj = activeStreets && activeStreets.length > 0 ? randomElement(activeStreets) : "Główna";
      const street = typeof streetObj === 'object' && streetObj !== null ? streetObj.name : streetObj;
      const incidentCoords = typeof streetObj === 'object' && streetObj !== null ? { lat: streetObj.lat, lng: streetObj.lon } : null;
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
            coords: incidentCoords || null,
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
            requiredSgr: scenarioObj.requiredSgr || null,
            createdAt: serverTimestamp()
          });
          logAction(\`🚨 Gra: Wymuszono nowe połączenie 112!\`);
      } catch(e) { console.error(e); }
    };
`);

// 2. Fix SWD ST styling for fieldsets
// Replace all flat fieldsets with SWD ST style fieldsets
content = content.replace(/border: '1px solid var\(--win-shadow\)'/g, "border: '2px groove threedface'");
content = content.replace(/border: '1px solid #ccc'/g, "border: '2px groove threedface'");

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx updated!');
