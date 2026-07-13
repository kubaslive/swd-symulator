const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for scenarios
if (!content.includes('const [dbScenarios, setDbScenarios] = useState([]);')) {
    content = content.replace(
        `  const [gmKdrMsg, setGmKdrMsg] = useState('');`,
        `  const [gmKdrMsg, setGmKdrMsg] = useState('');\n  const [dbScenarios, setDbScenarios] = useState([]);\n  const [newScenType, setNewScenType] = useState('pozar');\n  const [newScenLoc, setNewScenLoc] = useState('building');\n  const [newScenT, setNewScenT] = useState('');\n  const [newScenK, setNewScenK] = useState('');`
    );
}

// 2. Fetch scenarios from Firebase
if (!content.includes('const unsubScen = onSnapshot(collection(db, \'scenarios\')')) {
    const useEffectHook = `  useEffect(() => {
    if (!userProfile) return;
    const unsubScen = onSnapshot(collection(db, 'scenarios'), (snapshot) => {
      const arr = [];
      snapshot.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      setDbScenarios(arr);
    });
    return () => unsubScen();
  }, [userProfile]);`;

    content = content.replace(
        `  // Firebase realtime listener for calls`,
        `${useEffectHook}\n\n  // Firebase realtime listener for calls`
    );
}

// 3. Integrate with generateAndAddIncident
if (!content.includes('const dynamicScenarios = dbScenarios.filter(s => s.type === type);')) {
    content = content.replace(
        `            if (type === "pozar") {`,
        `            const dynamicScenarios = dbScenarios.filter(s => s.type === type);\n            if (type === "pozar") {`
    );

    content = content.replace(
        `              scenarioObj = randomElement(afScenarios);\n            }`,
        `              scenarioObj = randomElement(afScenarios);\n            }\n            if (dynamicScenarios.length > 0 && Math.random() > 0.5) {\n              scenarioObj = randomElement(dynamicScenarios);\n            }`
    );
}

// 4. Admin Panel UI for scenarios
const scenarioHtml = `          <button className="btn-win" onClick={() => setActiveMenuTab('scenariusze')}>📚 Edytor Scenariuszy</button>\n        </div>\n\n        {activeMenuTab === 'scenariusze' && (
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

if (!content.includes('Kreator Scenariuszy (Baza Globalna)')) {
    content = content.replace(
        `          <button className="btn-win" onClick={() => setActiveMenuTab('game_master')}>⚡ Mistrz Gry (Kreator Zdarzeń)</button>\n        </div>\n\n        {activeMenuTab === 'game_master' && (`,
        `${scenarioHtml}\n\n        {activeMenuTab === 'game_master' && (`
    );
}

fs.writeFileSync(file, content);
console.log('App.jsx patched successfully for scenarios!');
