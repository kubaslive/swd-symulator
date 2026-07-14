const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf-8');

const importStatement = `import { DEFAULT_SCENARIOS } from './scenarios';\n`;
if (!content.includes('import { DEFAULT_SCENARIOS }')) {
  content = content.replace("import React", importStatement + "import React");
}

const oldGen = `const type = randomElement(["pozar", "mz", "pozar", "mz", "mz", "af"]);`;
const newGen = `const type = randomElement(["pozar", "mz", "pozar", "mz", "mz", "af"]);
          let text = "";
          let expectedKdrMsg = "";
          let needsZRM = false;
          let needsPolice = false;
          let scenarioObj = {};
          
          const dynamicScenarios = dbScenarios.filter(s => s.type === type);
          const offlineScenarios = DEFAULT_SCENARIOS.filter(s => s.type === type);
          
          let usingDynamic = false;
          if (dynamicScenarios.length > 0 && Math.random() > 0.4) {
            scenarioObj = randomElement(dynamicScenarios);
            usingDynamic = true;
          } else {
            scenarioObj = randomElement(offlineScenarios);
            usingDynamic = true;
          }

          const street = randomElement(activeStreets);
          const houseNum = Math.floor(Math.random() * 150) + 1;
          
          if (usingDynamic) {
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
               const prefixes = locType === "commercial" ? ["Market Biedronka", "Sklep Żabka", "Stacja Paliw Orlen", "Lidl", "Pasaż Handlowy"] : ["Szkoła Podstawowa", "Przychodnia Rejonowa", "Urząd Skarbowy", "Dworzec"];
               location = \`\${city}, \${randomElement(prefixes)}, ul. \${street} \${houseNum}\`;
             } else {
               location = \`\${city}, ul. \${street} \${houseNum}\`;
             }
             text = scenarioObj.t;
             expectedKdrMsg = scenarioObj.k;
             needsZRM = !!scenarioObj.zrm;
             needsPolice = !!scenarioObj.pol;
          }
`;

const regex = /const type = randomElement\(\["pozar", "mz", "pozar", "mz", "mz", "af"\]\);[\s\S]*?(?=else \{)/;
content = content.replace(regex, newGen + `          // REMOVED AI BLOCK\n          `);

const aiRegex = /const localGeminiKey = localStorage\.getItem\('geminiApiKey'\);[\s\S]*?if \(!text\) \{/;
content = content.replace(aiRegex, `if (!text) {`);

fs.writeFileSync('src/App.jsx', content);
