const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Fix 1: _triggerManualWCPR
const triggerRegex = /window\._triggerManualWCPR = async \(\) => \{[\s\S]*?let location = `\$\{city\}, ul\. \$\{street\} \$\{houseNum\}`;/;

content = content.replace(triggerRegex, `window._triggerManualWCPR = async () => {
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
      let location = \`\${streetData.city}, ul. \${street} \${houseNum}\`;`);

// Fix 2: the game loop generator
const loopRegex = /const streetObj = randomElement\(activeStreets\);[\s\S]*?let location = "";/;
// Actually, looking at the code, it defines `location = ""` around line 1430, then inside `generateAndAddIncident`, it does `const streetObj = randomElement(activeStreets);`.

content = content.replace(/let activeStreets = streets;[\s\S]*?let location = "";/g, `let location = "";`);
content = content.replace(/const streetObj = randomElement\(activeStreets\);[\s\S]*?const houseNum = Math\.floor\(Math\.random\(\) \* 150\) \+ 1;/g, 
`const streetData = getRandomStreetWithCoords(city);
          const street = streetData.name;
          const incidentCoords = { lat: streetData.lat, lng: streetData.lon };
          const houseNum = Math.floor(Math.random() * 150) + 1;`);

content = content.replace(/let street2Obj = randomElement\(activeStreets\); let street2 = typeof street2Obj === 'object' \? street2Obj\.name : street2Obj;[\s\S]*?location = `\$\{city\}, Skrzyżowanie ul\. \$\{street\} z ul\. \$\{street2\}`;/g,
`const street2Data = getRandomStreetWithCoords(city);
            const street2 = street2Data.name;
            location = \`\${streetData.city}, Skrzyżowanie ul. \${street} z ul. \${street2}\`;`);

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx updated generator logic!');
