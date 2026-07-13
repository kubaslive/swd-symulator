const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add import
if (!content.includes('import SisEditor from')) {
    content = content.replace(
        `import MobileTerminal from './components/MobileTerminal';`,
        `import MobileTerminal from './components/MobileTerminal';\nimport SisEditor from './SisEditor';`
    );
}

// 2. Add state
if (!content.includes('const [isSisEditorOpen, setIsSisEditorOpen] = useState(false);')) {
    content = content.replace(
        `  const [isWcprEditorOpen, setIsWcprEditorOpen] = useState(false);`,
        `  const [isWcprEditorOpen, setIsWcprEditorOpen] = useState(false);\n  const [isSisEditorOpen, setIsSisEditorOpen] = useState(false);\n  const [gmTenantId, setGmTenantId] = useState('');\n  const [gmType, setGmType] = useState('pozar');\n  const [gmLocation, setGmLocation] = useState('');\n  const [gmDescription, setGmDescription] = useState('');\n  const [gmKdrMsg, setGmKdrMsg] = useState('');`
    );
}

// 3. Render Admin Dashboard
const adminHtml = `  const renderAdminDashboard = () => {
    return (
      <div style={{ padding: '20px', fontFamily: 'Courier New, monospace', color: '#111' }}>
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

        <h3 style={{ marginTop: '20px' }}>Użytkownicy w systemie ({usersList.length})</h3>`;

if (!content.includes('Otwórz Edytor SiS')) {
    content = content.replace(
        `  const renderAdminDashboard = () => {\n    return (\n      <div style={{ padding: '20px', fontFamily: 'Courier New, monospace', color: '#111' }}>\n        <h2 style={{ color: '#005fb8', borderBottom: '2px solid #ccc', paddingBottom: '8px', marginBottom: '16px' }}>Master Control Panel (Admin)</h2>\n        <h3 style={{ marginTop: 0 }}>Użytkownicy w systemie ({usersList.length})</h3>`,
        adminHtml
    );
}

// 4. Render SisEditor modal
const editorHtml = `        )}

        {isSisEditorOpen && (
          <SisEditor
            db={db}
            userProfile={userProfile}
            onClose={() => setIsSisEditorOpen(false)}
            tenantJrgUnits={tenantJrgUnits}
            tenantOspUnits={tenantOspUnits}
            tenantVehicles={tenantVehicles}
          />
        )}

        {isSettingsOpen && (`;

if (!content.includes('<SisEditor')) {
    content = content.replace(
        `        )}\n\n        {isSettingsOpen && (`,
        editorHtml
    );
}

fs.writeFileSync(file, content);
console.log('App.jsx patched successfully!');
