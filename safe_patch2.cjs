const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Patch window._triggerManualWCPR
const manualSearch = `    window._triggerManualWCPR = async () => {
      const callerName = \`\${randomElement(firstNames)} \${randomElement(lastNames)}\`;
      const phone = \`\${Math.floor(500 + Math.random() * 200)}-\${Math.floor(100 + Math.random() * 800)}-\${Math.floor(100 + Math.random() * 800)}\`;
      const type = randomElement(["pozar", "mz", "pozar", "mz", "mz"]);
      const dynamicScenarios = dbScenarios.filter(s => s.type === type);
      const offlineScenarios = DEFAULT_SCENARIOS.filter(s => s.type === type);
      const scenarioObj = (dynamicScenarios.length > 0 && Math.random() > 0.4) ? randomElement(dynamicScenarios) : randomElement(offlineScenarios);
      
      const city = gameModeCities.length > 0 ? randomElement(gameModeCities) : "Katowice";
      const streetData = getRandomStreetWithCoords(city);
      const street = streetData.name;
      const incidentCoords = { lat: streetData.lat, lng: streetData.lon };
      const houseNum = Math.floor(Math.random() * 150) + 1;
      let location = \`\${streetData.city}, ul. \${street} \${houseNum}\`;`;

const manualReplace = `    window._triggerManualWCPR = async () => {
      const callerName = \`\${randomElement(firstNames)} \${randomElement(lastNames)}\`;
      const phone = \`\${Math.floor(500 + Math.random() * 200)}-\${Math.floor(100 + Math.random() * 800)}-\${Math.floor(100 + Math.random() * 800)}\`;
      const type = randomElement(["pozar", "mz", "pozar", "mz", "mz"]);
      const dynamicScenarios = dbScenarios.filter(s => s.type === type);
      const offlineScenarios = DEFAULT_SCENARIOS.filter(s => s.type === type);
      const scenarioObj = (dynamicScenarios.length > 0 && Math.random() > 0.4) ? randomElement(dynamicScenarios) : randomElement(offlineScenarios);
      
      const locData = await getRandomLocationForGenerator(userProfile, gameModeCities, tenantName);
      const city = locData.city;
      const street = locData.street;
      const incidentCoords = locData.coords;
      const houseNum = Math.floor(Math.random() * 150) + 1;
      let location = \`\${city}, ul. \${street} \${houseNum}\`;`;

content = content.replace(manualSearch, manualReplace);


// Patch auto generator
const autoSearch1 = `        const settingsCities = userProfile?.settings?.generatorCities || gameModeCities || '';
        const parsedCities = settingsCities.split(',').map(s => s.trim()).filter(s => s.length > 0);
        let cityPool = [tenantName];
        if (tenantName === 'Będzin') cityPool = ['Będzin', 'Czeladź', 'Siewierz', 'Wojkowice', 'Sławków', 'Psary', 'Mierzęcice', 'Bobrowniki'];
        else if (tenantName === 'Katowice') cityPool = ['Katowice'];
        else if (tenantName === 'Zabrze') cityPool = ['Zabrze'];
        else if (tenantName === 'Bytom') cityPool = ['Bytom'];
        
        const city = parsedCities.length > 0 ? randomElement(parsedCities) : randomElement(cityPool);

        const callerName = \`\${randomElement(firstNames)} \${randomElement(lastNames)}\`;
        const phone = \`\${Math.floor(500 + Math.random() * 200)}-\${Math.floor(100 + Math.random() * 800)}-\${Math.floor(100 + Math.random() * 800)}\`;
        
        let location = "";
        
        const generateAndAddIncident = async () => {`;

const autoReplace1 = `        const callerName = \`\${randomElement(firstNames)} \${randomElement(lastNames)}\`;
        const phone = \`\${Math.floor(500 + Math.random() * 200)}-\${Math.floor(100 + Math.random() * 800)}-\${Math.floor(100 + Math.random() * 800)}\`;
        
        const generateAndAddIncident = async () => {
          const locData = await getRandomLocationForGenerator(userProfile, gameModeCities, tenantName);
          const city = locData.city;
          let location = "";`;

content = content.replace(autoSearch1, autoReplace1);

const autoSearch2 = `          const streetData = getRandomStreetWithCoords(city);
          const street = streetData.name;
          const incidentCoords = { lat: streetData.lat, lng: streetData.lon };
          const houseNum = Math.floor(Math.random() * 150) + 1;`;

const autoReplace2 = `          const street = locData.street;
          const incidentCoords = locData.coords;
          const houseNum = Math.floor(Math.random() * 150) + 1;`;

content = content.replace(autoSearch2, autoReplace2);

const autoSearch3 = `            const street2Data = getRandomStreetWithCoords(city);
            const street2 = street2Data.name;
            location = \`\${streetData.city}, Skrzyżowanie ul. \${street} z ul. \${street2}\`;`;
const autoReplace3 = `            const street2Data = await getRandomLocationForGenerator(userProfile, gameModeCities, tenantName);
            const street2 = street2Data.street;
            location = \`\${city}, Skrzyżowanie ul. \${street} z ul. \${street2}\`;`;

content = content.replace(autoSearch3, autoReplace3);

fs.writeFileSync('src/App.jsx', content);
console.log("safe_patch2 done.");
