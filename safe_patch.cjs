const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add imports
content = content.replace("import { getRandomStreetWithCoords } from './addressData';", "import { getRandomStreetWithCoords } from './addressData';\nimport { SettingsModal } from './components/SettingsModal';");

// 2. Add getRandomLocationForGenerator before `const App = () => {` or `function App() {`
const helperStr = `
const getRandomLocationForGenerator = async (userProfile, gameModeCities, tenantName) => {
  const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const settings = userProfile?.settings || {};
  const areas = settings.generatorAreas || [];

  if (areas.length > 0) {
    const area = randomElement(areas);
    if (area.bbox) {
      const latMin = Math.min(parseFloat(area.bbox[0]), parseFloat(area.bbox[1]));
      const latMax = Math.max(parseFloat(area.bbox[0]), parseFloat(area.bbox[1]));
      const lonMin = Math.min(parseFloat(area.bbox[2]), parseFloat(area.bbox[3]));
      const lonMax = Math.max(parseFloat(area.bbox[2]), parseFloat(area.bbox[3]));

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

        return { city: cityName, street: streetName, coords: { lat, lng: lon } };
      } catch (e) {
        console.error("Nominatim reverse geocoding failed", e);
      }
    }
  }

  const settingsCities = settings.generatorCities || gameModeCities || '';
  const parsedCities = settingsCities.split(',').map(s => s.trim()).filter(s => s.length > 0);
  let cityPool = [tenantName];
  if (tenantName === 'Będzin') cityPool = ['Będzin', 'Czeladź', 'Siewierz', 'Wojkowice', 'Sławków', 'Psary', 'Mierzęcice', 'Bobrowniki'];
  else if (tenantName === 'Katowice') cityPool = ['Katowice'];
  else if (tenantName === 'Zabrze') cityPool = ['Zabrze'];
  else if (tenantName === 'Bytom') cityPool = ['Bytom'];
  
  const city = parsedCities.length > 0 ? randomElement(parsedCities) : randomElement(cityPool);
  const streetData = getRandomStreetWithCoords(city);
  return { city: streetData.city, street: streetData.name, coords: { lat: streetData.lat, lng: streetData.lon } };
};

`;

if (content.includes("function App() {")) {
  content = content.replace("function App() {", helperStr + "function App() {");
} else {
  console.log("Could not find function App(). Let's find const App = () => {");
}

// 3. Replace Modal UI
const modalStart = `{/* -------------------------------------------------------------
          DIALOG MODAL: USTAWIENIA UŻYTKOWNIKA`;
const modalEndStr = `</select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1px solid var(--win-shadow)', paddingTop: '8px' }}>
                <button className="btn-win" onClick={() => setIsSettingsModalOpen(false)}>❌ Anuluj</button>
                <button className="btn-win" style={{ backgroundColor: '#2b8a3e', color: 'white', fontWeight: 'bold' }} onClick={handleSaveSettings}>
                  💾 Zapisz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}`;

const replacementModal = `{/* -------------------------------------------------------------
          DIALOG MODAL: USTAWIENIA UŻYTKOWNIKA (Zewnętrzny komponent)
          ------------------------------------------------------------- */}
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settingsData={settingsData}
        setSettingsData={setSettingsData}
        saveSettings={handleSaveSettings}
      />`;

const startIdx = content.indexOf(modalStart);
const endIdx = content.indexOf(modalEndStr);
if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + replacementModal + content.substring(endIdx + modalEndStr.length);
}

fs.writeFileSync('src/App.jsx', content);
console.log("safe_patch done.");
