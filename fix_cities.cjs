const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

const baseCoordsStr = `const getCityBaseCoords = (cityName) => {
  const norm = (cityName || "").toLowerCase();
  if (norm.includes("warszawa")) return { lat: 52.2297, lng: 21.0122 };
  if (norm.includes("kraków") || norm.includes("krakow")) return { lat: 50.0647, lng: 19.9450 };
  if (norm.includes("łódź") || norm.includes("lodz")) return { lat: 51.7592, lng: 19.4560 };
  if (norm.includes("wrocław") || norm.includes("wroclaw")) return { lat: 51.1079, lng: 17.0385 };
  if (norm.includes("poznań") || norm.includes("poznan")) return { lat: 52.4064, lng: 16.9252 };
  if (norm.includes("gdańsk") || norm.includes("gdansk")) return { lat: 54.3520, lng: 18.6466 };
  if (norm.includes("szczecin")) return { lat: 53.4285, lng: 14.5528 };
  if (norm.includes("bydgoszcz")) return { lat: 53.1235, lng: 18.0084 };
  if (norm.includes("lublin")) return { lat: 51.2465, lng: 22.5684 };
  if (norm.includes("białystok") || norm.includes("bialystok")) return { lat: 53.1325, lng: 23.1688 };
  if (norm.includes("będzin") || norm.includes("bedzin")) return { lat: 50.3276, lng: 19.1249 };
  if (norm.includes("zabrze")) return { lat: 50.3249, lng: 18.7857 };
  if (norm.includes("gliwice")) return { lat: 50.2976, lng: 18.6774 };
  if (norm.includes("sosnowiec")) return { lat: 50.2863, lng: 19.1039 };
  if (norm.includes("bytom")) return { lat: 50.3480, lng: 18.9157 };
  if (norm.includes("ruda")) return { lat: 50.2584, lng: 18.8555 };
  if (norm.includes("tychy")) return { lat: 50.1345, lng: 18.9880 };
  if (norm.includes("chorzów") || norm.includes("chorzow")) return { lat: 50.2976, lng: 18.9545 };
  if (norm.includes("dg") || norm.includes("dąbrowa") || norm.includes("dabrowa")) return { lat: 50.3204, lng: 19.1897 };
  return { lat: 50.2599, lng: 19.0216 };
};

const getCoordinatesForLocation = (locStr, cityName = "Katowice") => {
  const norm = (locStr || "").toLowerCase();
  if (cityName.toLowerCase().includes("katowice")) {
    if (norm.includes("szopienic")) return { lat: 50.2644, lng: 19.0833 };
    if (norm.includes("dąbrówk") || norm.includes("dabrowk")) return { lat: 50.2764, lng: 19.0681 };
    if (norm.includes("kostuchn")) return { lat: 50.1878, lng: 18.9950 };
    if (norm.includes("podles")) return { lat: 50.1820, lng: 18.9660 };
    if (norm.includes("zarzecz")) return { lat: 50.1866, lng: 18.9482 };
    if (norm.includes("piotrowic")) return { lat: 50.2078, lng: 18.9806 };
    if (norm.includes("ligot")) return { lat: 50.2238, lng: 18.9680 };
    if (norm.includes("centrum") || norm.includes("korfant")) return { lat: 50.2599, lng: 19.0216 };
  }
  
  const baseCoords = getCityBaseCoords(cityName);
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = ((hash % 100) - 50) / 1000;
  const lngOffset = (((hash >> 8) % 100) - 50) / 1000;
  return { lat: baseCoords.lat + latOffset, lng: baseCoords.lng + lngOffset };
};`;

const oldCoordsRegex = /const getCoordinatesForLocation = \(locStr\) => \{[\s\S]*?return \{ lat: 50\.25 \+ latOffset, lng: 19\.02 \+ lngOffset \};\n\};/m;
app = app.replace(oldCoordsRegex, baseCoordsStr);


// Replace handleFindHydrants
app = app.replace('const coords = getCoordinatesForLocation(locStr);', 'const coords = getCoordinatesForLocation(locStr, tenantName);');

// Replace renderMapaGIS map container
const oldMapContainerRegex = /<MapContainer center=\{\[50\.2599, 19\.0216\]\} zoom=\{12\} style=\{\{ width: '100%', height: '100%' \}\}>/;
const newMapContainer = `const mapCenter = getCityBaseCoords(tenantName || "Katowice");
        return (
          <MapContainer key={tenantName} center={[mapCenter.lat, mapCenter.lng]} zoom={12} style={{ width: '100%', height: '100%' }}>`;
app = app.replace(oldMapContainerRegex, newMapContainer.replace('        return (\n          ', ''));

app = app.replace("const coords = getCoordinatesForLocation(inc.location);", "const coords = getCoordinatesForLocation(inc.location, tenantName);");

fs.writeFileSync('src/App.jsx', app);
console.log("Success");
