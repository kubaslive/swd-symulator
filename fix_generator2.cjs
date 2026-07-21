const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// We will inject `getRandomLocationForGenerator` at the top of App.jsx, right before the App component.
const locationHelperStr = `
const getRandomLocationForGenerator = async (userProfile, gameModeCities, tenantName) => {
  const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const settings = userProfile?.settings || {};
  const areas = settings.generatorAreas || [];

  if (areas.length > 0) {
    const area = randomElement(areas);
    if (area.bbox) {
      // bbox is [latMin, latMax, lonMin, lonMax]
      const latMin = Math.min(parseFloat(area.bbox[0]), parseFloat(area.bbox[1]));
      const latMax = Math.max(parseFloat(area.bbox[0]), parseFloat(area.bbox[1]));
      const lonMin = Math.min(parseFloat(area.bbox[2]), parseFloat(area.bbox[3]));
      const lonMax = Math.max(parseFloat(area.bbox[2]), parseFloat(area.bbox[3]));

      // generate random point in bounding box
      const lat = latMin + Math.random() * (latMax - latMin);
      const lon = lonMin + Math.random() * (lonMax - lonMin);

      try {
        const res = await fetch(\`https://nominatim.openstreetmap.org/reverse?lat=\${lat}&lon=\${lon}&format=json\`);
        const data = await res.json();
        
        let streetName = "Główna";
        let cityName = area.name;

        if (data && data.address) {
          streetName = data.address.road || data.address.pedestrian || data.address.path || "Główna";
          cityName = data.address.city || data.address.town || data.address.village || area.name;
        }

        return {
          city: cityName,
          street: streetName,
          coords: { lat, lng: lon }
        };
      } catch (e) {
        console.error("Nominatim reverse geocoding failed", e);
      }
    }
  }

  // Fallback to old logic
  const settingsCities = settings.generatorCities || gameModeCities || '';
  const parsedCities = settingsCities.split(',').map(s => s.trim()).filter(s => s.length > 0);
  let cityPool = [tenantName];
  if (tenantName === 'Będzin') cityPool = ['Będzin', 'Czeladź', 'Siewierz', 'Wojkowice', 'Sławków', 'Psary', 'Mierzęcice', 'Bobrowniki'];
  else if (tenantName === 'Katowice') cityPool = ['Katowice'];
  else if (tenantName === 'Zabrze') cityPool = ['Zabrze'];
  else if (tenantName === 'Bytom') cityPool = ['Bytom'];
  
  const city = parsedCities.length > 0 ? randomElement(parsedCities) : randomElement(cityPool);
  const streetData = getRandomStreetWithCoords(city);
  return {
    city: streetData.city,
    street: streetData.name,
    coords: { lat: streetData.lat, lng: streetData.lon }
  };
};
`;

content = content.replace("function App() {", locationHelperStr + "\nfunction App() {");

// Now update `window._triggerManualWCPR = async () => {`
// old code:
/*
      const city = gameModeCities.length > 0 ? randomElement(gameModeCities) : "Katowice";
      const streetData = getRandomStreetWithCoords(city);
      const street = streetData.name;
      const incidentCoords = { lat: streetData.lat, lng: streetData.lon };
      const houseNum = Math.floor(Math.random() * 150) + 1;
      let location = `${streetData.city}, ul. ${street} ${houseNum}`;
*/
const manualTriggerRegex = /const city = gameModeCities\.length > 0 \? randomElement\(gameModeCities\) : "Katowice";[\s\S]*?let location = `\$\{streetData\.city\}, ul\. \$\{street\} \$\{houseNum\}`;/;
content = content.replace(manualTriggerRegex, `const locData = await getRandomLocationForGenerator(userProfile, gameModeCities, tenantName);
      const city = locData.city;
      const street = locData.street;
      const incidentCoords = locData.coords;
      const houseNum = Math.floor(Math.random() * 150) + 1;
      let location = \`\${city}, ul. \${street} \${houseNum}\`;`);

// Now update the main game loop: generateAndAddIncident
/*
old code to replace:
        const settingsCities = userProfile?.settings?.generatorCities || gameModeCities || '';
        const parsedCities = settingsCities.split(',').map(s => s.trim()).filter(s => s.length > 0);
        let cityPool = [tenantName];
        if (tenantName === 'Będzin') cityPool = ['Będzin', 'Czeladź', 'Siewierz', 'Wojkowice', 'Sławków', 'Psary', 'Mierzęcice', 'Bobrowniki'];
        else if (tenantName === 'Katowice') cityPool = ['Katowice'];
        else if (tenantName === 'Zabrze') cityPool = ['Zabrze'];
        else if (tenantName === 'Bytom') cityPool = ['Bytom'];
        
        const city = parsedCities.length > 0 ? randomElement(parsedCities) : randomElement(cityPool);

        const callerName = `${randomElement(firstNames)} ${randomElement(lastNames)}`;
        const phone = `${Math.floor(500 + Math.random() * 200)}-${Math.floor(100 + Math.random() * 800)}-${Math.floor(100 + Math.random() * 800)}`;
        
        let location = "";
        
        const generateAndAddIncident = async () => {
*/

const loopRegex = /const settingsCities = userProfile\?\.settings\?\.generatorCities[\s\S]*?const generateAndAddIncident = async \(\) => \{/;
content = content.replace(loopRegex, `
        const callerName = \`\${randomElement(firstNames)} \${randomElement(lastNames)}\`;
        const phone = \`\${Math.floor(500 + Math.random() * 200)}-\${Math.floor(100 + Math.random() * 800)}-\${Math.floor(100 + Math.random() * 800)}\`;
        
        const generateAndAddIncident = async () => {
          const locData = await getRandomLocationForGenerator(userProfile, gameModeCities, tenantName);
          const city = locData.city;
          let location = "";
`);

// Now replace inside generateAndAddIncident:
/*
          const streetData = getRandomStreetWithCoords(city);
          const street = streetData.name;
          const incidentCoords = { lat: streetData.lat, lng: streetData.lon };
          const houseNum = Math.floor(Math.random() * 150) + 1;
*/
const streetDataRegex = /const streetData = getRandomStreetWithCoords\(city\);[\s\S]*?const houseNum = Math\.floor\(Math\.random\(\) \* 150\) \+ 1;/;
content = content.replace(streetDataRegex, `
          const street = locData.street;
          const incidentCoords = locData.coords;
          const houseNum = Math.floor(Math.random() * 150) + 1;
`);

// Also need to replace street2Data:
/*
          } else if (locType === "intersection") {
            const street2Data = getRandomStreetWithCoords(city);
            const street2 = street2Data.name;
            location = `${streetData.city}, Skrzyżowanie ul. ${street} z ul. ${street2}`;
*/
const intersectionRegex = /const street2Data = getRandomStreetWithCoords\(city\);[\s\S]*?location = `\$\{streetData\.city\}, Skrzyżowanie ul\. \$\{street\} z ul\. \$\{street2\}`;/;
content = content.replace(intersectionRegex, `
            const street2Data = await getRandomLocationForGenerator(userProfile, gameModeCities, tenantName);
            const street2 = street2Data.street;
            location = \`\${city}, Skrzyżowanie ul. \${street} z ul. \${street2}\`;
`);


fs.writeFileSync('src/App.jsx', content);
console.log('Done!');
