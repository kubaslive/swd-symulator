const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Add requiredSgr to "Mistrz Gry" form
code = code.replace(
  `const [gmLocation, setGmLocation] = useState('');`,
  `const [gmLocation, setGmLocation] = useState('');\n  const [gmSgr, setGmSgr] = useState('');`
);

code = code.replace(
  `<option value="mz">Miejscowe Zagrożenie</option>
                <option value="af">Alarm Fałszywy</option>
              </select>
            </div>`,
  `<option value="mz">Miejscowe Zagrożenie</option>
                <option value="af">Alarm Fałszywy</option>
              </select>
              <select value={gmSgr} onChange={e => setGmSgr(e.target.value)} className="win-input">
                <option value="">-- Brak Wymogu SGR --</option>
                <option value="SGRW">SGRW (Wysokościowa)</option>
                <option value="SGRN">SGRN (Nurkowa)</option>
                <option value="SGRChem-Eko">SGRChem-Eko</option>
                <option value="SGPR">SGPR (Poszukiwawczo-Ratownicza)</option>
                <option value="SGRT">SGRT (Techniczna)</option>
              </select>
            </div>`
);

code = code.replace(
  `needsZRM: false,
                  needsPolice: false,`,
  `needsZRM: false,
                  needsPolice: false,
                  requiredSgr: gmSgr || null,`
);

// Add requiredSgr to some default scenarios
code = code.replace(
  `{ type: "mz", text: "Zgłoszenie o substancji ropopochodnej na rzece.", expectedKdrMsg: "Potwierdzam plamę oleju na powierzchni około 50m.", zrm: false, pol: true, updates: ["Plama ograniczona zaporą.", "Zakończono neutralizację."] }`,
  `{ type: "mz", text: "Zgłoszenie o silnym wycieku nieznanej substancji chemicznej z cysterny kolejowej.", expectedKdrMsg: "Potwierdzam intensywny wyciek. Konieczna ewakuacja w promieniu 100m.", requiredSgr: "SGRChem-Eko", requiredUnits: 4, zrm: true, pol: true, updates: ["SGRChem-Eko na miejscu. Przystępujemy do uszczelniania.", "Wyciek zlikwidowany. Neutralizacja terenu."] },\n  { type: "mz", text: "Zgłoszenie o substancji ropopochodnej na rzece.", expectedKdrMsg: "Potwierdzam plamę oleju na powierzchni około 50m.", zrm: false, pol: true, updates: ["Plama ograniczona zaporą.", "Zakończono neutralizację."] }`
);

code = code.replace(
  `{ type: "pozar", text: "Zgłoszenie o pożarze mieszkania na 3 piętrze.", expectedKdrMsg: "Z okien na 3 piętrze wydobywa się dym, wewnątrz mogą znajdować się ludzie.", zrm: true, pol: true, updates: ["Wprowadzono roty z nawodnieniem, ewakuowano 2 osoby.", "Pożar opanowany, trwa oddymianie."] }`,
  `{ type: "pozar", text: "Zgłoszenie o pożarze mieszkania na 3 piętrze.", expectedKdrMsg: "Z okien na 3 piętrze wydobywa się dym, wewnątrz mogą znajdować się ludzie.", zrm: true, pol: true, updates: ["Wprowadzono roty z nawodnieniem, ewakuowano 2 osoby.", "Pożar opanowany, trwa oddymianie."] },\n  { type: "mz", text: "Próba samobójcza - człowiek na kominie fabrycznym (wys. 50m).", expectedKdrMsg: "Osoba grozi skokiem. Brak bezpośredniego dostępu.", requiredSgr: "SGRW", requiredUnits: 2, zrm: true, pol: true, updates: ["Negocjacje trwają, SGRW przygotowuje stanowisko.", "Osoba bezpiecznie ewakuowana przez ratowników wysokościowych."] }`
);

fs.writeFileSync('src/App.jsx', code);
