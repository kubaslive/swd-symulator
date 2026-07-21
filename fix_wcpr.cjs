const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src/App.jsx');
let content = fs.readFileSync(p, 'utf8');

// 1. Add wcprTargetJrg state
if (!content.includes('const [wcprTargetJrg, setWcprTargetJrg] = useState(')) {
  content = content.replace(
    /const \[activeCallToAnswer, setActiveCallToAnswer\] = useState\(null\);/,
    "const [activeCallToAnswer, setActiveCallToAnswer] = useState(null);\n  const [wcprTargetJrg, setWcprTargetJrg] = useState('JRG 1');"
  );
}

// 2. Update handleAnswerCall to pre-guess the JRG
content = content.replace(
  /const handleAnswerCall = \(call\) => \{\s*setActiveCallToAnswer\(call\);\s*setSelectedWcprCallForModal\(call\);\s*setIsWcprCallModalOpen\(true\);\s*\};/,
  `const handleAnswerCall = (call) => {
    setActiveCallToAnswer(call);
    setSelectedWcprCallForModal(call);
    
    // Zgadywanie rejonu dla ułatwienia
    let guessedJrg = "JRG 1";
    const norm = (call.location || '').toLowerCase();
    if (norm.includes("szopienic") || norm.includes("dąbrówk") || norm.includes("dabrowk") || norm.includes("janów") || norm.includes("janow") || norm.includes("giszowiec") || norm.includes("nikiszowiec") || norm.includes("szopienick")) {
      guessedJrg = "JRG 1";
    } else if (norm.includes("piotrowic") || norm.includes("kostuchn") || norm.includes("podles") || norm.includes("zarzecz") || norm.includes("ligot") || norm.includes("panewnik") || norm.includes("piotrowick")) {
      guessedJrg = "JRG 2";
    } else if (norm.includes("centrum") || norm.includes("bogucic") || norm.includes("zawodzi") || norm.includes("koszutk") || norm.includes("wełnowiec") || norm.includes("welnowiec") || norm.includes("korfant") || norm.includes("mariack") || norm.includes("dworco")) {
      guessedJrg = "JRG 3";
    }
    setWcprTargetJrg(guessedJrg);
    
    setIsWcprCallModalOpen(true);
  };`
);

// 3. Update proceedWithCallAccept to use wcprTargetJrg
content = content.replace(
  /let targetJrg = "JRG 1";[\s\S]*?targetJrg = "JRG 3";\s*\}/,
  `let targetJrg = wcprTargetJrg || "JRG 1";`
);

// 4. Inject Rejon JRG dropdown into the WCPR modal UI
// Find: <span style={{ fontSize: '11px', width: '70px', fontWeight: '500' }}>Priorytet</span>
content = content.replace(
  /<div style=\{\{ display: 'flex', gap: '6px', alignItems: 'center' \}\}>\s*<span style=\{\{ fontSize: '11px', width: '70px', fontWeight: '500' \}\}>Priorytet<\/span>\s*<select className="win-input" style=\{\{ flex: 1, background: '#fff' \}\} readOnly value="Pilny">\s*<option>Pilny<\/option>\s*<\/select>\s*<\/div>/,
  `<div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', width: '70px', fontWeight: '500' }}>Priorytet</span>
                        <select className="win-input" style={{ flex: 1, background: '#fff' }} readOnly value="Pilny">
                          <option>Pilny</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', width: '70px', fontWeight: 'bold', color: '#b91c1c' }}>Rejon JRG</span>
                        <select className="win-input" style={{ flex: 1, background: '#fff', border: '1px solid #b91c1c', fontWeight: 'bold' }} value={wcprTargetJrg} onChange={(e) => setWcprTargetJrg(e.target.value)}>
                          {JRG_UNITS.map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                      </div>`
);

// Fix layout of "Karta Zdarzenia PSP"
// Find fields in Karta Zdarzenia
content = content.replace(
  /legend style=\{\{ fontSize: '9px' \}\}>Czas<\/legend>/g,
  `legend style={{ fontSize: '10px', color: '#0a246a' }}>Czas</legend>`
);
content = content.replace(
  /legend style=\{\{ fontSize: '9px' \}\}>Przyjęcie zgł\.<\/legend>/g,
  `legend style={{ fontSize: '10px', color: '#0a246a' }}>Zgłoszenie / Jednostka</legend>`
);
content = content.replace(
  /legend style=\{\{ fontSize: '9px' \}\}>Lokalizacja<\/legend>/g,
  `legend style={{ fontSize: '10px', color: '#0a246a' }}>Lokalizacja</legend>`
);
content = content.replace(
  /legend style=\{\{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '5px' \}\}>\s*Dane osoby zgłaszającej/g,
  `legend style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px', color: '#0a246a' }}>
                          Dane osoby zgłaszającej`
);

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed WCPR Target JRG and UI');
