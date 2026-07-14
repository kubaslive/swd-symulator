const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf-8');

const newGenerator = `const type = randomElement(["pozar", "mz", "pozar", "mz", "mz", "af"]);
          let text = "";
          let expectedKdrMsg = "";
          let needsZRM = false;
          let needsPolice = false;
          let scenarioObj = {};
          
          const dynamicScenarios = dbScenarios.filter(s => s.type === type);
          const offlineScenarios = DEFAULT_SCENARIOS.filter(s => s.type === type);
          
          if (dynamicScenarios.length > 0 && Math.random() > 0.4) {
            scenarioObj = randomElement(dynamicScenarios);
          } else {
            scenarioObj = randomElement(offlineScenarios);
          }

          const street = randomElement(activeStreets);
          const houseNum = Math.floor(Math.random() * 150) + 1;
          
          const locType = scenarioObj.locType || "building";
          if (locType === "apartment") {
            const m = Math.floor(Math.random() * 60) + 1;
            location = \`\${city}, ul. \${street} \${houseNum} m. \${m}\`;
          } else if (locType === "intersection") {
            let street2 = randomElement(activeStreets);
            while (street2 === street && activeStreets.length > 1) {
              street2 = randomElement(activeStreets);
            }
            location = \`\${city}, Skrzyżowanie ul. \${street} z ul. \${street2}\`;
          } else if (locType === "forest") {
            location = \`\${city}, Kompleks leśny, dojazd od ul. \${street}\`;
          } else if (locType === "road") {
            location = \`\${city}, odcinek drogi ul. \${street}\`;
          } else if (locType === "industrial") {
            const prefixes = ["Hala Magazynowa", "Zakład Produkcyjny", "Skup Złomu", "Tartak"];
            location = \`\${city}, \${randomElement(prefixes)}, ul. \${street} \${houseNum}\`;
          } else if (locType === "commercial" || locType === "public") {
            const prefixes = locType === "commercial" ? ["Market Biedronka", "Sklep Żabka", "Stacja Paliw Orlen", "Lidl", "Pasaż Handlowy"] : ["Szkoła Podstawowa", "Przychodnia Rejonowa", "Urząd Skarbowy", "Dworzec", "Komisariat Policji"];
            location = \`\${city}, \${randomElement(prefixes)}, ul. \${street} \${houseNum}\`;
          } else {
            location = \`\${city}, ul. \${street} \${houseNum}\`;
          }
          
          text = scenarioObj.t;
          expectedKdrMsg = scenarioObj.k;
          needsZRM = !!scenarioObj.zrm;
          needsPolice = !!scenarioObj.pol;
`;

// Replace from `const type = randomElement(["pozar"` down to `try {` (before addDoc)
const regex = /const type = randomElement\(\["pozar", "mz", "pozar", "mz", "mz", "af"\]\);[\s\S]*?(?=try \{)/;
content = content.replace(regex, newGenerator + "\n          ");

fs.writeFileSync('src/App.jsx', content);
