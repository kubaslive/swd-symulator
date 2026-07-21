const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src/App.jsx');
let content = fs.readFileSync(p, 'utf8');

if(!content.includes('MapCenterUpdater')) {
// Add useMap to imports if not there
content = content.replace(/import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';/, `import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';`);

// Define MapCenterUpdater
const mapUpdaterCode = `
function MapCenterUpdater({ selectedIncidentId, incidents, getCoordinatesForLocation }) {
  const map = useMap();
  React.useEffect(() => {
    if (selectedIncidentId) {
      const inc = incidents.find(i => i.id === selectedIncidentId);
      if (inc) {
        const coords = inc.coords || getCoordinatesForLocation(inc.location, inc.tenantId);
        map.flyTo([coords.lat, coords.lng], 15, { animate: true, duration: 1.5 });
      }
    }
  }, [selectedIncidentId, incidents, map, getCoordinatesForLocation]);
  return null;
}
`;

// Insert it before the App component definition
content = content.replace(/const App = \(\) => {/, mapUpdaterCode + '\nconst App = () => {');
}

// Inject inside MapContainer
content = content.replace(/<TileLayer/, `<MapCenterUpdater selectedIncidentId={selectedIncidentId} incidents={incidents} getCoordinatesForLocation={getCoordinatesForLocation} />\n            <TileLayer`);

// Update CircleMarker coords
content = content.replace(/const coords = getCoordinatesForLocation\(inc\.location\);/g, `const coords = inc.coords || getCoordinatesForLocation(inc.location, inc.tenantId);`);

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed Map centering');
