import React, { useState } from 'react';
import { COUNTY_CITY_MAP } from '../addressData';

export const SettingsModal = ({ isOpen, onClose, settingsData, setSettingsData, saveSettings }) => {
  const [activeTab, setActiveTab] = useState('ogolne');

  const safeSettingsData = settingsData || {};

  if (!isOpen) return null;

  return (
    <div className="win-dialog-overlay" style={{ zIndex: 99990 }}>
      <div className="win-dialog border-outset" style={{ width: '400px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backgroundColor: 'var(--win-face)' }}>
        <div className="win-titlebar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Ustawienia Systemu SWD</span>
          <button className="win-titlebar-close" onClick={onClose}>X</button>
        </div>
        
        <div style={{ display: 'flex', borderBottom: '1px solid #a0a0a0', background: 'var(--win-face)', padding: '4px 4px 0 4px' }}>
          <button 
            className={`btn-win ${activeTab === 'ogolne' ? 'active-tab' : ''}`} 
            onClick={() => setActiveTab('ogolne')}
            style={{ 
              padding: '4px 12px', 
              marginRight: '2px', 
              borderBottom: activeTab === 'ogolne' ? 'none' : '',
              backgroundColor: activeTab === 'ogolne' ? '#fff' : 'var(--win-face)',
              zIndex: activeTab === 'ogolne' ? 2 : 1,
              position: 'relative',
              top: activeTab === 'ogolne' ? '1px' : '0'
            }}
          >
            Ogólne
          </button>
          <button 
            className={`btn-win ${activeTab === 'rejon' ? 'active-tab' : ''}`} 
            onClick={() => setActiveTab('rejon')}
            style={{ 
              padding: '4px 12px', 
              borderBottom: activeTab === 'rejon' ? 'none' : '',
              backgroundColor: activeTab === 'rejon' ? '#fff' : 'var(--win-face)',
              zIndex: activeTab === 'rejon' ? 2 : 1,
              position: 'relative',
              top: activeTab === 'rejon' ? '1px' : '0'
            }}
          >
            Rejon Działania
          </button>
        </div>

        <div className="border-inset" style={{ margin: '8px', padding: '12px', flex: 1, backgroundColor: '#fff', fontSize: '11px', minHeight: '200px' }}>
          {activeTab === 'ogolne' && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Częstotliwość Zdarzeń (Tryb Gry)</label>
                <select 
                  className="input-field" 
                  value={safeSettingsData.gameModeDifficulty || 'normal'} 
                  onChange={e => setSettingsData({...settingsData, gameModeDifficulty: e.target.value})}
                  style={{ width: '100%', padding: '2px' }}
                >
                  <option value="easy">Spokojny dyżur (zdarzenie co 4-5 min)</option>
                  <option value="normal">Normalny dzień (zdarzenie co 2-3 min)</option>
                  <option value="hard">Armagedon (zdarzenie co 30-60 sek)</option>
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Dźwięk nowej formatki WCPR</label>
                <select 
                  className="input-field" 
                  value={safeSettingsData.customSound || 'buzzer'} 
                  onChange={e => setSettingsData({...settingsData, customSound: e.target.value})}
                  style={{ width: '100%', padding: '2px' }}
                >
                  <option value="buzzer">Domyślny WCPR (Buzzer)</option>
                  <option value="bell">Klasyczny Dzwonek (Telefoniczny)</option>
                  <option value="siren">Dyskretna Syrena</option>
                  <option value="ping">Krótki PING</option>
                  <option value="custom">Własny plik z dysku (.mp3)</option>
                </select>
                {safeSettingsData.customSound === 'custom' && (
                  <div style={{ marginTop: '8px', padding: '8px', border: '1px dashed #a0a0a0', backgroundColor: '#f9f9f9' }}>
                    <label style={{ display: 'block', marginBottom: '4px' }}>Wybierz mały plik audio (.mp3, .wav):</label>
                    <input 
                      type="file" 
                      accept="audio/*" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert("Plik jest za duży! Wybierz plik poniżej 2MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setSettingsData({...settingsData, customSound: 'custom', customAudioBase64: reader.result});
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {safeSettingsData.customAudioBase64 && (
                      <div style={{ marginTop: '4px', color: 'green', fontWeight: 'bold' }}>✓ Zapisano własny dźwięk w pamięci przeglądarki</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'rejon' && (
            <div>
              <p style={{ marginBottom: '12px', color: '#333', fontSize: '11px' }}>
                Zaznacz obszary, dla których system ma pobrać siatkę prawdziwych ulic do symulacji zdarzeń (z serwerów OpenStreetMap).
                Im więcej obszarów, tym dłużej trwa pierwsze ładowanie.
              </p>
              
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Obszar chroniony gry:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #a0a0a0', padding: '5px', backgroundColor: '#fff' }}>
                {Object.keys(COUNTY_CITY_MAP).map(area => {
                  const currentAreas = safeSettingsData.generatorCities ? safeSettingsData.generatorCities.split(',').map(s => s.trim()).filter(Boolean) : [];
                  const isChecked = currentAreas.includes(area);
                  return (
                    <label key={area} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {
                          let newAreas = [...currentAreas];
                          if (isChecked) {
                            newAreas = newAreas.filter(a => a !== area);
                          } else {
                            newAreas.push(area);
                          }
                          setSettingsData({...settingsData, generatorCities: newAreas.join(',')});
                        }}
                      />
                      {area}
                    </label>
                  );
                })}
              </div>
              <p style={{ marginTop: '8px', fontStyle: 'italic', color: '#666', fontSize: '10px' }}>
                Zapisanie ustawień nadpisze domyślny rejon (Katowice) i wygeneruje nową siatkę ulic. Brak wyboru przywraca Katowice.
              </p>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', padding: '8px', background: 'var(--win-face)' }}>
          <button className="btn-win" onClick={onClose} style={{ width: '80px' }}>Anuluj</button>
          <button className="btn-win" style={{ width: '80px', fontWeight: 'bold' }} onClick={saveSettings}>Zapisz</button>
        </div>
      </div>
    </div>
  );
};
