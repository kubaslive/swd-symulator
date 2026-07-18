import React, { useState, useEffect } from 'react';
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
}

const SisEditor = ({ db, userProfile, onClose, tenantJrgUnits, tenantOspUnits, tenantVehicles, tenantUnitCoordinates }) => {
  const [jrgUnits, setJrgUnits] = useState(Array.isArray(tenantJrgUnits) ? [...tenantJrgUnits] : Object.values(tenantJrgUnits || {}));
  const [ospUnits, setOspUnits] = useState(Array.isArray(tenantOspUnits) ? [...tenantOspUnits] : Object.values(tenantOspUnits || {}));
  const [vehicles, setVehicles] = useState({ ...(tenantVehicles || {}) });
  const [unitCoordinates, setUnitCoordinates] = useState({ ...(tenantUnitCoordinates || {}) });
  
  const [activeTab, setActiveTab] = useState('jrg');
  const [newItemName, setNewItemName] = useState('');
  const [mapPickerTarget, setMapPickerTarget] = useState(null);
  
  const [selectedUnit, setSelectedUnit] = useState('');
  const [vehName, setVehName] = useState('');
  const [vehObsada, setVehObsada] = useState(6);
  const [vehType, setVehType] = useState('GBA');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Synchronize when props change if needed (but usually editing locally is fine)
  useEffect(() => {
    if (!loading) {
      setJrgUnits(Array.isArray(tenantJrgUnits) ? [...tenantJrgUnits] : Object.values(tenantJrgUnits || {}));
      setOspUnits(Array.isArray(tenantOspUnits) ? [...tenantOspUnits] : Object.values(tenantOspUnits || {}));
      setVehicles({ ...(tenantVehicles || {}) });
      setUnitCoordinates({ ...(tenantUnitCoordinates || {}) });
    }
  }, [tenantJrgUnits, tenantOspUnits, tenantVehicles, tenantUnitCoordinates]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {

      if (!userProfile.tenantId) {
        setError("Twoje konto nie posiada przypisanego profilu Komendy (tenantId). WSKR nie może posiadać własnej bazy SiS. Utwórz lokalne konto dyspozytora.");
        setLoading(false);
        return;
      }
      const tenantRef = doc(db, 'tenants', userProfile.tenantId);

      await updateDoc(tenantRef, {
        jrgUnits,
        ospUnits,
        vehicles,
        unitCoordinates
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Błąd zapisu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnit = (type) => {
    if (!newItemName.trim()) return;
    if (type === 'jrg') {
      if (!jrgUnits.includes(newItemName)) setJrgUnits([...jrgUnits, newItemName]);
    } else {
      if (!ospUnits.includes(newItemName)) setOspUnits([...ospUnits, newItemName]);
    }
    setNewItemName('');
  };

  const handleRemoveUnit = (type, name) => {
    if (type === 'jrg') {
      setJrgUnits(jrgUnits.filter(u => u !== name));
    } else {
      setOspUnits(ospUnits.filter(u => u !== name));
    }
    // Also remove vehicles for this unit
    const newVehicles = { ...vehicles };
    delete newVehicles[name];
    setVehicles(newVehicles);
  };

  const handleAddVehicle = () => {
    if (!selectedUnit || !vehName.trim()) return;
    const unitVehicles = vehicles[selectedUnit] || [];
    const newVeh = { name: vehName, obsada: Number(vehObsada), type: vehType };
    setVehicles({
      ...vehicles,
      [selectedUnit]: [...unitVehicles, newVeh]
    });
    setVehName('');
  };

  const handleRemoveVehicle = (unit, vehIndex) => {
    const unitVehicles = [...(vehicles[unit] || [])];
    unitVehicles.splice(vehIndex, 1);
    setVehicles({
      ...vehicles,
      [unit]: unitVehicles
    });
  };

  const allUnitsList = ["KM/KP PSP", ...jrgUnits, ...ospUnits];

  return (
    <div className="win-dialog border-outset" style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', zIndex: 10000, position: 'absolute', top: '10vh', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="win-dialog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Edytor Sił i Środków - {userProfile.tenantId}</span>
        <button className="btn-win" onClick={onClose} style={{ padding: '0 5px' }}>X</button>
      </div>
      
      <div className="win-dialog-body" style={{ background: 'var(--win-face)', padding: '10px', flex: 1, overflowY: 'auto' }}>
        {error && <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '10px' }}>{error}</div>}
        
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #fff', marginBottom: '10px' }}>
          <button className={`tab-btn ${activeTab === "jrg" ? "active" : ""}`} onClick={() => setActiveTab("jrg")}>JRG</button>
          <button className={`tab-btn ${activeTab === "osp" ? "active" : ""}`} onClick={() => setActiveTab("osp")}>OSP</button>
          <button className={`tab-btn ${activeTab === "vehicles" ? "active" : ""}`} onClick={() => setActiveTab("vehicles")}>Pojazdy</button>
        </div>

        {/* JRG Tab */}
        {activeTab === 'jrg' && (
          <div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nazwa JRG (np. JRG nr 1 Katowice)" className="input-field" style={{ flex: 1 }} />
              <button className="btn-win" onClick={() => handleAddUnit('jrg')}>Dodaj</button>
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--win-shadow)', borderRadius: '4px', height: '200px', overflowY: 'scroll', padding: '5px' }}>
              {jrgUnits.map(u => (
                <div key={u} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #ccc', padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>{u}</span>
                    <button onClick={() => handleRemoveUnit('jrg', u)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none', fontSize: '10px' }}>X Usun</button>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '2px', alignItems: 'center' }}>
                    <input type="text" placeholder="Lat (np. 50.25)" className="input-field" style={{ width: '80px', fontSize: '9px' }} value={unitCoordinates[u]?.lat || ''} onChange={(e) => setUnitCoordinates({...unitCoordinates, [u]: {...unitCoordinates[u], lat: e.target.value}})} />
                    <input type="text" placeholder="Lng (np. 19.02)" className="input-field" style={{ width: '80px', fontSize: '9px' }} value={unitCoordinates[u]?.lng || ''} onChange={(e) => setUnitCoordinates({...unitCoordinates, [u]: {...unitCoordinates[u], lng: e.target.value}})} />
                    <button onClick={() => setMapPickerTarget(u)} className="btn-win" style={{ fontSize: '9px', padding: '0 5px' }}>📍 Z Mapy</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OSP Tab */}
        {activeTab === 'osp' && (
          <div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nazwa OSP (np. OSP Szopienice)" className="input-field" style={{ flex: 1 }} />
              <button className="btn-win" onClick={() => handleAddUnit('osp')}>Dodaj</button>
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--win-shadow)', borderRadius: '4px', height: '200px', overflowY: 'scroll', padding: '5px' }}>
              {ospUnits.map(u => (
                <div key={u} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #ccc', padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>{u}</span>
                    <button onClick={() => handleRemoveUnit('osp', u)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none', fontSize: '10px' }}>X Usun</button>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '2px', alignItems: 'center' }}>
                    <input type="text" placeholder="Lat (np. 50.25)" className="input-field" style={{ width: '80px', fontSize: '9px' }} value={unitCoordinates[u]?.lat || ''} onChange={(e) => setUnitCoordinates({...unitCoordinates, [u]: {...unitCoordinates[u], lat: e.target.value}})} />
                    <input type="text" placeholder="Lng (np. 19.02)" className="input-field" style={{ width: '80px', fontSize: '9px' }} value={unitCoordinates[u]?.lng || ''} onChange={(e) => setUnitCoordinates({...unitCoordinates, [u]: {...unitCoordinates[u], lng: e.target.value}})} />
                    <button onClick={() => setMapPickerTarget(u)} className="btn-win" style={{ fontSize: '9px', padding: '0 5px' }}>📍 Z Mapy</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div>
            <div style={{ marginBottom: '10px' }}>
              <label>Jednostka:</label>
              <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} className="input-field" style={{ width: '100%' }}>
                <option value="">-- Wybierz --</option>
                {allUnitsList.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {selectedUnit && (
              <>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', alignItems: 'center' }}>
                  <input type="text" value={vehName} onChange={e => setVehName(e.target.value)} placeholder="Nazwa wozu (np. GBA 2.5/16)" className="input-field" style={{ flex: 2 }} />
                  <input type="number" value={vehObsada} onChange={e => setVehObsada(e.target.value)} title="Obsada" className="input-field" style={{ width: '50px' }} min="1" max="8" />
                  <select value={vehType} onChange={e => setVehType(e.target.value)} className="input-field">
                    <option value="GBA">GBA</option>
                    <option value="GCBA">GCBA</option>
                    <option value="GLBM">GLBM</option>
                    <option value="SCD">SCD</option>
                    <option value="SCRT">SCRT</option>
                    <option value="SLKw">SLKw</option>
                    <option value="SLRr">SLRr</option>
                  </select>
                  <button className="btn-win" onClick={handleAddVehicle}>Dodaj</button>
                </div>
                <div style={{ background: '#fff', border: '1px solid var(--win-shadow)', borderRadius: '4px', height: '180px', overflowY: 'scroll', padding: '5px' }}>
                  {(Array.isArray(vehicles[selectedUnit]) ? vehicles[selectedUnit] : Object.values(vehicles[selectedUnit] || {})).map((v, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', padding: '2px 0' }}>
                      <span>{v.name} ({v.type}) - obsada: {v.obsada}</span>
                      <button onClick={() => handleRemoveVehicle(selectedUnit, i)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none' }}>X</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
            <div className="win-dialog-footer" style={{ background: 'var(--win-face)', padding: '10px', display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #fff' }}>
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
      )}
    </div>
  );
};

export default SisEditor;
