const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  const renderAdminDashboard = () => {
    return (
      <div style={{ padding: '16px', overflowY: 'auto', height: '100%', backgroundColor: '#f0f0f0' }} className="border-inset fade-in">
        <h2 style={{ color: '#005fb8', borderBottom: '2px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>Master Control Panel (Admin)</h2>`;

const replacement1 = `  const renderAdminDashboard = () => {
    return (
      <div style={{ padding: '16px', overflowY: 'auto', height: '100%', backgroundColor: '#f0f0f0' }} className="border-inset fade-in">
        <h2 style={{ color: '#005fb8', borderBottom: '2px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>Master Control Panel (Admin)</h2>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
          <div style={{ flex: 1, backgroundColor: '#f0f5fa', border: '1px solid #b3d4ff', borderRadius: '4px', padding: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#005fb8' }}>Zdarzenia w Buforze</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{incidents.filter(i => i.status === 'pending').length}</div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#f0f5fa', border: '1px solid #b3d4ff', borderRadius: '4px', padding: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#005fb8' }}>Zdarzenia Aktywne</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{incidents.filter(i => i.status === 'dispatched' || i.status === 'on_scene').length}</div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#f0f5fa', border: '1px solid #b3d4ff', borderRadius: '4px', padding: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#005fb8' }}>Zdarzenia Zakończone</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{incidents.filter(i => i.status === 'processed').length}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <button className="btn-win" onClick={() => setIsSisEditorOpen(true)}>🔧 Otwórz Edytor SiS (Jednostki)</button>
          <button className="btn-win" onClick={() => setActiveMenuTab('game_master')}>⚡ Mistrz Gry (Kreator Zdarzeń)</button>
          <button className="btn-win" onClick={() => setActiveMenuTab('scenariusze')}>📚 Edytor Scenariuszy</button>
        </div>

        {activeMenuTab === 'game_master' && (
          <div style={{ border: '1px solid #999', padding: '15px', backgroundColor: '#e1e1e1', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Mistrz Gry - Wymuś Zdarzenie</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <select value={gmTenantId} onChange={e => setGmTenantId(e.target.value)} className="win-input">
                <option value="">-- Wybierz komendę (Tenant) --</option>
                {allTenants.map(t => <option key={t.id} value={t.id}>{t.name} [{t.id}]</option>)}
              </select>
              <select value={gmType} onChange={e => setGmType(e.target.value)} className="win-input">
                <option value="pozar">Pożar</option>
                <option value="mz">Miejscowe Zagrożenie</option>
                <option value="af">Alarm Fałszywy</option>
              </select>
            </div>
            <input type="text" placeholder="Lokalizacja (np. Katowice, ul. Złota 2)" className="win-input" style={{ width: '100%', marginBottom: '10px' }} value={gmLocation} onChange={e => setGmLocation(e.target.value)} />
            <textarea placeholder="Opis zgłoszenia z formatki WCPR..." className="win-input" style={{ width: '100%', height: '60px', marginBottom: '10px' }} value={gmDescription} onChange={e => setGmDescription(e.target.value)} />
            <textarea placeholder="Meldunek KDR na miejscu..." className="win-input" style={{ width: '100%', height: '60px', marginBottom: '10px' }} value={gmKdrMsg} onChange={e => setGmKdrMsg(e.target.value)} />
            <button className="btn-win" style={{ fontWeight: 'bold', color: 'red' }} onClick={async () => {
              if (!gmTenantId || !gmLocation || !gmDescription) return alert('Wypełnij wymagane pola!');
              try {
                await addDoc(collection(db, 'calls'), {
                  tenantId: gmTenantId,
                  type: gmType,
                  category: gmType,
                  status: 'pending',
                  location: gmLocation,
                  address: gmLocation,
                  gminaStr: \`Wymuszone przez Admina\`,
                  miejscowoscStr: gmLocation.split(',')[0] || 'Miasto',
                  description: gmDescription,
                  callerName: 'GMD',
                  phone: '+48 000 000 000',
                  expectedKdrMsg: gmKdrMsg || 'Rozpoznanie: Zgodnie z formatką.',
                  needsZRM: false,
                  needsPolice: false,
                  createdAt: serverTimestamp(),
                  isRead: false
                });
                alert('Zdarzenie wymuszone pomyślnie!');
                setGmLocation(''); setGmDescription(''); setGmKdrMsg('');
              } catch (e) { alert('Błąd: ' + e.message); }
            }}>🚀 WYŚLIJ ZDARZENIE DO BUFORA</button>
          </div>
        )}

        {activeMenuTab === 'scenariusze' && (
          <div style={{ border: '1px solid #999', padding: '15px', backgroundColor: '#e1e1e1', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Kreator Scenariuszy (Baza Globalna)</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <select value={newScenType} onChange={e => setNewScenType(e.target.value)} className="win-input">
                <option value="pozar">Pożar</option>
                <option value="mz">Miejscowe Zagrożenie</option>
                <option value="af">Alarm Fałszywy</option>
              </select>
              <select value={newScenLoc} onChange={e => setNewScenLoc(e.target.value)} className="win-input">
                <option value="building">Budynek (ul. X 12)</option>
                <option value="apartment">Mieszkanie (ul. X 12 m. 5)</option>
                <option value="intersection">Skrzyżowanie (ul. X z ul. Y)</option>
                <option value="road">Droga (odcinek ul. X)</option>
                <option value="forest">Las (Dojazd od ul. X)</option>
                <option value="industrial">Teren przemysłowy</option>
              </select>
            </div>
            <textarea placeholder="Treść formatki 112 (Co mówi świadek?)..." className="win-input" style={{ width: '100%', height: '60px', marginBottom: '10px' }} value={newScenT} onChange={e => setNewScenT(e.target.value)} />
            <textarea placeholder="Meldunek KDR po dojeździe..." className="win-input" style={{ width: '100%', height: '60px', marginBottom: '10px' }} value={newScenK} onChange={e => setNewScenK(e.target.value)} />
            <button className="btn-win" style={{ fontWeight: 'bold' }} onClick={async () => {
              if (!newScenT || !newScenK) return alert('Wypełnij treści!');
              try {
                await addDoc(collection(db, 'scenarios'), {
                  type: newScenType,
                  locType: newScenLoc,
                  t: newScenT,
                  k: newScenK,
                  reportedType: newScenType === 'af' ? 'pozar' : newScenType
                });
                alert('Scenariusz dodany pomyślnie!');
                setNewScenT(''); setNewScenK('');
              } catch(e) { alert('Błąd: ' + e.message); }
            }}>💾 ZAPISZ SCENARIUSZ DO BAZY</button>
            <div style={{ marginTop: '20px', maxHeight: '200px', overflowY: 'auto', border: '1px inset #fff', backgroundColor: '#fff', padding: '10px' }}>
              <strong>Zapisane w bazie ({dbScenarios.length}):</strong><br/>
              {dbScenarios.map(s => <div key={s.id} style={{ borderBottom: '1px dashed #ccc', padding: '5px 0' }}>[{s.type.toUpperCase()}] {s.t.substring(0, 50)}...</div>)}
            </div>
          </div>
        )}`;

if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.log("Target 1 not found");
}
