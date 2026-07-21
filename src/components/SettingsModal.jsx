import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Rectangle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// A component to auto-recenter map when search results come in
const MapRecenter = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds);
    }
  }, [bounds, map]);
  return null;
};

export const SettingsModal = ({ isOpen, onClose, settingsData, setSettingsData, saveSettings }) => {
  const [activeTab, setActiveTab] = useState('ogolne');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGeoJson, setSelectedGeoJson] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);

  // Initialize generatorAreas if missing
  const generatorAreas = settingsData.generatorAreas || [];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&polygon_geojson=1&countrycodes=pl`);
      const data = await res.json();
      setSearchResults(data);
      if (data.length > 0) {
        handleSelectResult(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleSelectResult = (item) => {
    // boundingbox is [latMin, latMax, lonMin, lonMax]
    const bb = item.boundingbox;
    if (bb) {
      const bounds = [
        [parseFloat(bb[0]), parseFloat(bb[2])],
        [parseFloat(bb[1]), parseFloat(bb[3])]
      ];
      setMapBounds(bounds);
    }
    setSelectedGeoJson(item);
  };

  const handleAddArea = () => {
    if (!selectedGeoJson) return;
    const newArea = {
      id: selectedGeoJson.osm_id,
      name: selectedGeoJson.display_name.split(',')[0],
      fullName: selectedGeoJson.display_name,
      bbox: selectedGeoJson.boundingbox // [latMin, latMax, lonMin, lonMax]
    };
    
    // Check if already added
    if (generatorAreas.find(a => a.id === newArea.id)) return;

    setSettingsData({
      ...settingsData,
      generatorAreas: [...generatorAreas, newArea]
    });
  };

  const handleRemoveArea = (id) => {
    setSettingsData({
      ...settingsData,
      generatorAreas: generatorAreas.filter(a => a.id !== id)
    });
  };

  // Convert geojson geometry to Leaflet Polygon positions
  const getPolygonPositions = (geojson) => {
    if (!geojson) return [];
    if (geojson.type === 'Polygon') {
      return geojson.coordinates.map(ring => ring.map(coord => [coord[1], coord[0]]));
    } else if (geojson.type === 'MultiPolygon') {
      return geojson.coordinates.map(poly => poly.map(ring => ring.map(coord => [coord[1], coord[0]])));
    }
    return [];
  };

  if (!isOpen) return null;

  return (
    <div className="win-dialog-overlay" style={{ zIndex: 99990 }}>
      <div className="win-dialog border-outset" style={{ width: '650px', height: '550px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', borderRadius: '8px' }}>
        <div className="win-dialog-header">
          <span>Ustawienia Użytkownika</span>
          <button className="btn-win" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 'bold' }} onClick={onClose}>X</button>
        </div>
        
        {/* TABS */}
        <div style={{ display: 'flex', background: 'var(--win-face)', borderBottom: '2px solid #d1d1d1' }}>
          <button className={`btn-win ${activeTab === 'ogolne' ? 'active' : ''}`} onClick={() => setActiveTab('ogolne')} style={{ fontWeight: activeTab === 'ogolne' ? 'bold' : 'normal', flex: 1, padding: '5px' }}>Ogólne / Gra</button>
          <button className={`btn-win ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')} style={{ fontWeight: activeTab === 'ai' ? 'bold' : 'normal', flex: 1, padding: '5px' }}>AI / Integracje</button>
          <button className={`btn-win ${activeTab === 'rejon' ? 'active' : ''}`} onClick={() => setActiveTab('rejon')} style={{ fontWeight: activeTab === 'rejon' ? 'bold' : 'normal', flex: 1, padding: '5px' }}>Rejon Operacyjny (GIS)</button>
        </div>

        <div className="win-dialog-content border-inset" style={{ flex: 1, padding: '12px', background: '#fff', fontSize: '11px', overflowY: 'auto' }}>
          
          {activeTab === 'ogolne' && (
            <div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Nazwa jednostki nadrzędnej (np. KM PSP Będzin)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={settingsData.kmkpName || ''} 
                  onChange={e => setSettingsData({...settingsData, kmkpName: e.target.value})}
                  placeholder="Domyślna nazwa zostanie użyta, jeśli puste"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Wzór numeru zdarzenia (zmienne: {`{prefix}, {nr}, {rok}`})</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={settingsData.incidentFormat || ''} 
                  onChange={e => setSettingsData({...settingsData, incidentFormat: e.target.value})}
                  placeholder="{prefix}-{nr}"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Wzór numeru meldunku (zmienne: {`{nr}, {rok}`})</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={settingsData.reportFormat || ''} 
                  onChange={e => setSettingsData({...settingsData, reportFormat: e.target.value})}
                  placeholder="EWID/{nr}/{rok}"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', border: '1px solid #d1d1d1' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#005fb8' }}>Rozgrywka / Symulator</strong>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Poziom Trudności (częstość zgłoszeń WCPR)</label>
                  <select 
                    className="input-field" 
                    value={settingsData.difficulty || 'normal'} 
                    onChange={e => setSettingsData({...settingsData, difficulty: e.target.value})}
                    style={{ width: '100%' }}
                  >
                    <option value="easy">Spokojny dyżur (zdarzenie co 4-5 min)</option>
                    <option value="normal">Normalny dzień (zdarzenie co 2-3 min)</option>
                    <option value="hard">Armagedon / Front Burzowy (zdarzenie co 30-60 sek)</option>
                  </select>
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Dźwięk nowej formatki WCPR</label>
                  <select 
                    className="input-field" 
                    value={settingsData.customSound || 'buzzer'} 
                    onChange={e => setSettingsData({...settingsData, customSound: e.target.value})}
                    style={{ width: '100%' }}
                  >
                    <option value="buzzer">Domyślny WCPR (Buzzer)</option>
                    <option value="bell">Klasyczny Dzwonek (Telefoniczny)</option>
                    <option value="siren">Dyskretna Syrena</option>
                    <option value="ping">Krótki PING</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div>
              <div style={{ marginBottom: '15px', padding: '10px', background: '#e8f4fd', border: '1px solid #b8d4f2', borderRadius: '4px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#005fb8' }}>🤖 AI Generator (Google Gemini)</strong>
                <p style={{ margin: '0 0 8px 0', color: '#555' }}>Wygeneruj i wprowadź klucz API Google Gemini (AI Studio), aby zdarzenia z Trybu Gry były wymyślane przez Sztuczną Inteligencję na żywo!</p>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Klucz API Gemini (zostaje tylko na Twoim PC)</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={settingsData.geminiApiKey || ''} 
                  onChange={e => setSettingsData({...settingsData, geminiApiKey: e.target.value})}
                  placeholder="AIzaSy..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', border: '1px solid #d1d1d1', borderRadius: '4px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#5865F2' }}>🎮 Integracja Discord (Webhook)</strong>
                <p style={{ margin: '0 0 8px 0', color: '#555' }}>Wklej URL Webhooka z Twojego serwera Discord, aby powiadamiać znajomych o wysłanych zastępach i powrotach.</p>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Adres URL Webhooka</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={settingsData.discordWebhookUrl || ''} 
                  onChange={e => setSettingsData({...settingsData, discordWebhookUrl: e.target.value})}
                  placeholder="https://discord.com/api/webhooks/..."
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'rejon' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <p style={{ marginBottom: '8px' }}>Wyszukaj i dodaj miasta/powiaty, w których mają generować się zdarzenia. Puste = domyślne ustawienia (Katowice).</p>
              
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="np. Powiat Będziński"
                  style={{ flex: 1 }}
                />
                <button className="btn-win" onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? 'Szukam...' : '🔍 Szukaj'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div style={{ marginBottom: '10px', maxHeight: '60px', overflowY: 'auto', border: '1px solid #ccc', padding: '2px' }}>
                  {searchResults.slice(0,3).map(res => (
                    <div 
                      key={res.osm_id} 
                      style={{ padding: '2px 5px', cursor: 'pointer', background: selectedGeoJson?.osm_id === res.osm_id ? '#005fb8' : 'transparent', color: selectedGeoJson?.osm_id === res.osm_id ? 'white' : 'black' }}
                      onClick={() => handleSelectResult(res)}
                    >
                      {res.display_name}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ flex: 1, border: '2px groove threedface', position: 'relative', minHeight: '200px' }}>
                <MapContainer center={[50.2587, 19.0175]} zoom={10} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapRecenter bounds={mapBounds} />
                  
                  {/* Draw currently searched geometry */}
                  {selectedGeoJson && selectedGeoJson.geojson && (
                    <Polygon positions={getPolygonPositions(selectedGeoJson.geojson)} pathOptions={{ color: '#005fb8', fillColor: '#005fb8', fillOpacity: 0.2 }} />
                  )}

                  {/* Draw saved areas (as rectangles based on bbox) */}
                  {generatorAreas.map(area => {
                    if(!area.bbox) return null;
                    const bounds = [
                      [parseFloat(area.bbox[0]), parseFloat(area.bbox[2])],
                      [parseFloat(area.bbox[1]), parseFloat(area.bbox[3])]
                    ];
                    return (
                      <Rectangle key={area.id} bounds={bounds} pathOptions={{ color: '#2b8a3e', weight: 2, fillOpacity: 0.1 }} />
                    );
                  })}
                </MapContainer>

                <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
                  <button className="btn-win" style={{ padding: '5px 15px', fontWeight: 'bold', background: '#e0f0ff' }} onClick={handleAddArea} disabled={!selectedGeoJson}>
                    ➕ Dodaj zaznaczony do rejonu
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <strong>Aktywne Strefy ({generatorAreas.length}):</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                  {generatorAreas.length === 0 && <span style={{ color: '#888' }}>Brak - używane domyślne</span>}
                  {generatorAreas.map(area => (
                    <span key={area.id} style={{ background: '#2b8a3e', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {area.name} 
                      <b style={{ cursor: 'pointer', color: '#ffb3b3' }} onClick={() => handleRemoveArea(area.id)}>×</b>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '2px groove threedface', padding: '8px', background: 'var(--win-face)' }}>
          <button className="btn-win" onClick={onClose}>❌ Anuluj</button>
          <button className="btn-win" style={{ backgroundColor: '#2b8a3e', color: 'white', fontWeight: 'bold' }} onClick={saveSettings}>
            💾 Zapisz
          </button>
        </div>
      </div>
    </div>
  );
};
