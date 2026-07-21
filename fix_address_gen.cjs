const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src/App.jsx');
let content = fs.readFileSync(p, 'utf8');

// Replace auto-generation logic
content = content.replace(/const street = randomElement\(activeStreets\);([\s\S]*?)const houseNum = Math\.floor\(Math\.random\(\) \* 150\) \+ 1;/m, `const streetObj = randomElement(activeStreets);
          const street = typeof streetObj === 'object' && streetObj !== null ? streetObj.name : streetObj;
          const incidentCoords = typeof streetObj === 'object' && streetObj !== null ? { lat: streetObj.lat, lng: streetObj.lon } : null;
          const houseNum = Math.floor(Math.random() * 150) + 1;`);

content = content.replace(/let street2 = randomElement\(activeStreets\);/g, `let street2Obj = randomElement(activeStreets); let street2 = typeof street2Obj === 'object' ? street2Obj.name : street2Obj;`);

content = content.replace(/while \(street2 === street && activeStreets\.length > 1\) {/g, `while (street2 === street && activeStreets.length > 1) {`);

content = content.replace(/street2 = randomElement\(activeStreets\);/g, `street2Obj = randomElement(activeStreets); street2 = typeof street2Obj === 'object' ? street2Obj.name : street2Obj;`);

// Inject coords into the addDoc call for auto-generation
content = content.replace(/location: location,\s*address: location,\s*gminaStr: `Gmina m\. \${city}`/m, `location: location,
              address: location,
              coords: incidentCoords || null,
              gminaStr: \`Gmina m. \${city}\``);

// Now fix _triggerManualWCPR
content = content.replace(/let street = activeStreets && activeStreets\.length > 0 \? randomElement\(activeStreets\) : "Główna";\s*const houseNum = Math\.floor\(Math\.random\(\) \* 150\) \+ 1;/m, `const streetObj = activeStreets && activeStreets.length > 0 ? randomElement(activeStreets) : "Główna";
        const street = typeof streetObj === 'object' && streetObj !== null ? streetObj.name : streetObj;
        const incidentCoords = typeof streetObj === 'object' && streetObj !== null ? { lat: streetObj.lat, lng: streetObj.lon } : null;
        const houseNum = Math.floor(Math.random() * 150) + 1;`);

// Inject coords into the addDoc call for _triggerManualWCPR
content = content.replace(/location: location,\s*address: location,\s*gminaStr: `Gmina m\. \${city}`/g, `location: location,
              address: location,
              coords: incidentCoords || null,
              gminaStr: \`Gmina m. \${city}\``);

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed address generation logic');
