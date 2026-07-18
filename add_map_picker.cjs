const fs = require('fs');
let code = fs.readFileSync('src/SisEditor.jsx', 'utf8');

// 1. Add imports and MapClickHandler
const imports = `import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    }
  });
  return null;
}`;

code = code.replace(
  "import React, { useState, useEffect } from 'react';\nimport { doc, updateDoc } from 'firebase/firestore';",
  imports
);

// 2. Add state
code = code.replace(
  "const [newItemName, setNewItemName] = useState('');",
  "const [newItemName, setNewItemName] = useState('');\n  const [mapPickerTarget, setMapPickerTarget] = useState(null);"
);

// 3. Add buttons for JRG and OSP
const coordInputs = `<div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                    <input type="text" placeholder="Lat (np. 50.25)" className="input-field" style={{ width: '80px', fontSize: '9px' }} value={unitCoordinates[u]?.lat || ''} onChange={(e) => setUnitCoordinates({...unitCoordinates, [u]: {...unitCoordinates[u], lat: e.target.value}})} />
                    <input type="text" placeholder="Lng (np. 19.02)" className="input-field" style={{ width: '80px', fontSize: '9px' }} value={unitCoordinates[u]?.lng || ''} onChange={(e) => setUnitCoordinates({...unitCoordinates, [u]: {...unitCoordinates[u], lng: e.target.value}})} />`;

const coordInputsWithButton = `<div style={{ display: 'flex', gap: '5px', marginTop: '2px', alignItems: 'center' }}>
                    <input type="text" placeholder="Lat (np. 50.25)" className="input-field" style={{ width: '80px', fontSize: '9px' }} value={unitCoordinates[u]?.lat || ''} onChange={(e) => setUnitCoordinates({...unitCoordinates, [u]: {...unitCoordinates[u], lat: e.target.value}})} />
                    <input type="text" placeholder="Lng (np. 19.02)" className="input-field" style={{ width: '80px', fontSize: '9px' }} value={unitCoordinates[u]?.lng || ''} onChange={(e) => setUnitCoordinates({...unitCoordinates, [u]: {...unitCoordinates[u], lng: e.target.value}})} />
                    <button onClick={() => setMapPickerTarget(u)} className="btn-win" style={{ fontSize: '9px', padding: '0 5px' }}>📍 Z Mapy</button>`;

code = code.split(coordInputs).join(coordInputsWithButton);

// 4. Add Map Modal Overlay
const mapModal = `      <div className="win-dialog-footer" style={{ background: '#d4d0c8', padding: '10px', display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #fff' }}>
        <button className="btn-win" onClick={onClose} style={{ padding: '4px 15px' }}>Anuluj</button>
        <button className="btn-win" onClick={handleSave} disabled={loading} style={{ padding: '4px 15px', fontWeight: 'bold' }}>
          {loading ? 'Zapisywanie...' : 'Zapisz do bazy'}
        </button>
      </div>

      {mapPickerTarget && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 10001, display: 'flex', flexDirection: 'column' }}>
          <div className="win-dialog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📍 Zaznacz na mapie współrzędne dla: {mapPickerTarget}</span>
            <button className="btn-win" onClick={() => setMapPickerTarget(null)} style={{ padding: '0 5px' }}>X</button>
          </div>
          <div style={{ flex: 1, background: '#fff', position: 'relative' }}>
            <MapContainer center={[52.0, 19.0]} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler onSelect={(latlng) => {
                setUnitCoordinates({...unitCoordinates, [mapPickerTarget]: { lat: latlng.lat.toFixed(6), lng: latlng.lng.toFixed(6) }});
                setMapPickerTarget(null);
              }} />
              {unitCoordinates[mapPickerTarget]?.lat && unitCoordinates[mapPickerTarget]?.lng && (
                <Marker position={[parseFloat(unitCoordinates[mapPickerTarget].lat), parseFloat(unitCoordinates[mapPickerTarget].lng)]} />
              )}
            </MapContainer>
          </div>
        </div>
      )}`;

code = code.replace(
  `<div className="win-dialog-footer" style={{ background: '#d4d0c8', padding: '10px', display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #fff' }}>
        <button className="btn-win" onClick={onClose} style={{ padding: '4px 15px' }}>Anuluj</button>
        <button className="btn-win" onClick={handleSave} disabled={loading} style={{ padding: '4px 15px', fontWeight: 'bold' }}>
          {loading ? 'Zapisywanie...' : 'Zapisz do bazy'}
        </button>
      </div>`,
  mapModal
);

fs.writeFileSync('src/SisEditor.jsx', code);
