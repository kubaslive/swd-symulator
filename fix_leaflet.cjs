const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Imports
if (!app.includes("import 'leaflet/dist/leaflet.css';")) {
  app = app.replace("import React,", "import 'leaflet/dist/leaflet.css';\nimport { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';\nimport React,");
}

// 2. getCoordinatesForLocation update
const oldCoordsRegex = /const getCoordinatesForLocation = \(locStr\) => \{[\s\S]*?return \{ x, y \};\n\};/m;
const newCoords = `const getCoordinatesForLocation = (locStr) => {
  const norm = (locStr || "").toLowerCase();
  if (norm.includes("szopienic")) return { lat: 50.2644, lng: 19.0833 };
  if (norm.includes("dąbrówk") || norm.includes("dabrowk")) return { lat: 50.2764, lng: 19.0681 };
  if (norm.includes("kostuchn")) return { lat: 50.1878, lng: 18.9950 };
  if (norm.includes("podles")) return { lat: 50.1820, lng: 18.9660 };
  if (norm.includes("zarzecz")) return { lat: 50.1866, lng: 18.9482 };
  if (norm.includes("piotrowic")) return { lat: 50.2078, lng: 18.9806 };
  if (norm.includes("ligot")) return { lat: 50.2238, lng: 18.9680 };
  if (norm.includes("centrum") || norm.includes("korfant")) return { lat: 50.2599, lng: 19.0216 };
  
  // Deterministic coordinate based on string hash for unknown locations
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = (hash % 100) / 1000;
  const lngOffset = ((hash >> 8) % 100) / 1000;
  return { lat: 50.25 + latOffset, lng: 19.02 + lngOffset };
};`;
app = app.replace(oldCoordsRegex, newCoords);

// 3. renderMapaGIS update
const mapStart = 'const renderMapaGIS = () => {';
const mapEndStr = '  // Render Kalkulator ODO';
const mapIdx1 = app.indexOf(mapStart);
const mapIdx2 = app.indexOf(mapEndStr);

const newMap = `const renderMapaGIS = () => {
    return (
      <div className="tab-content" style={{ padding: '0', height: '100%', overflow: 'hidden', background: '#e0e0e0', position: 'relative', border: '2px solid #d1d1d1' }}>
        <div className="section-header" style={{ marginBottom: '0', background: '#005fb8', color: 'white', padding: '5px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
          <span style={{ fontWeight: 'bold' }}>SYSTEM WSPOMAGANIA DECYZJI - MODUŁ GEOGRAFICZNY (GIS)</span>
        </div>
        
        <div style={{ width: '100%', height: '100%', position: 'relative', paddingTop: '24px' }}>
          <MapContainer center={[50.2599, 19.0216]} zoom={12} style={{ width: '100%', height: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {incidents.filter(inc => !inc.isArchived && inc.status !== 'processed').map(inc => {
              const coords = getCoordinatesForLocation(inc.location);
              const isSelected = selectedIncidentId === inc.id;
              const color = inc.type === 'pozar' ? '#ff4b4b' : inc.type === 'mz' ? '#ffcc00' : '#4dabf7';
              
              return (
                <CircleMarker 
                  key={inc.id}
                  center={[coords.lat, coords.lng]} 
                  pathOptions={{ color: color, fillColor: color, fillOpacity: 0.7 }}
                  radius={isSelected ? 12 : 8}
                  eventHandlers={{
                    click: () => setSelectedIncidentId(inc.id)
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={isSelected}>
                    <span>{inc.customId || inc.id.substring(0,4)}</span>
                  </Tooltip>
                  {isSelected && (
                    <Popup>
                      <strong>{inc.location}</strong><br/>
                      {inc.description}
                    </Popup>
                  )}
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    );
  };`;

if (mapIdx1 !== -1 && mapIdx2 !== -1) {
   app = app.substring(0, mapIdx1) + newMap + '\n\n' + app.substring(mapIdx2);
}

// 4. Update the simulated hydrants calculation that used x,y
const simulatedHydrantsRegex = /const dist = Math\.round\(Math\.sqrt\(Math\.pow\(h\.x - coords\.x, 2\) \+ Math\.pow\(h\.y - coords\.y, 2\)\) \* 12\);/;
app = app.replace(simulatedHydrantsRegex, 'const dist = Math.round(Math.sqrt(Math.pow(h.x - (coords.lng*100), 2) + Math.pow(h.y - (coords.lat*100), 2)) * 12);');

// 5. Update TTS with custom sound
const ttsCodeOld = `if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance('nowe zdarzenie odbierz');
                utterance.lang = 'pl-PL';
                window.speechSynthesis.speak(utterance);
              }`;

const ttsCodeNew = `const soundUrl = userProfile?.settings?.wcprSoundUrl;
              if (soundUrl) {
                const audio = new Audio(soundUrl);
                audio.play().catch(e => console.error("Audio play failed:", e));
              } else if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance('nowe zdarzenie odbierz');
                utterance.lang = 'pl-PL';
                window.speechSynthesis.speak(utterance);
              }`;
app = app.replace(ttsCodeOld, ttsCodeNew);

// 6. Settings Modal Update
const oldSettingsFieldStart = '<span>Webhook URL (Discord)</span>';
const oldSettingsFieldFull = `<span>Webhook URL (Discord)</span>
                <input 
                  type="text" 
                  value={settingsData.discordWebhookUrl || ''} 
                  onChange={e => setSettingsData({ ...settingsData, discordWebhookUrl: e.target.value })}
                  style={{ flex: 1, padding: '4px', fontSize: '11px', border: '1px solid #d1d1d1' }}
                  placeholder="https://discord.com/api/webhooks/..."
                />`;

const newSettingsFieldFull = `<span>Własny dźwięk WCPR (.mp3)</span>
                <input 
                  type="file" 
                  accept="audio/*"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 800000) {
                      alert("Plik jest za duży! Maksymalnie ~800KB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setSettingsData({ ...settingsData, wcprSoundUrl: event.target.result });
                    };
                    reader.readAsDataURL(file);
                  }}
                  style={{ flex: 1, padding: '4px', fontSize: '11px' }}
                />
                {settingsData.wcprSoundUrl && (
                  <button className="btn-win" onClick={(e) => { e.preventDefault(); new Audio(settingsData.wcprSoundUrl).play(); }}>▶ Testuj</button>
                )}
                {settingsData.wcprSoundUrl && (
                  <button className="btn-win" onClick={(e) => { e.preventDefault(); setSettingsData({ ...settingsData, wcprSoundUrl: '' }); }}>❌ Usuń</button>
                )}`;

app = app.replace(oldSettingsFieldFull, newSettingsFieldFull);

fs.writeFileSync('src/App.jsx', app);
console.log("Success");
