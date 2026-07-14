const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetGeneratorAI = `                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt,
                });
                let textResp = response.text.replace(/\\x60\\x60\\x60json/g, '').replace(/\\x60\\x60\\x60/g, '').trim();
                const parsed = JSON.parse(textResp);
                location = parsed.adres;
                text = parsed.t;
                expectedKdrMsg = parsed.k;
                needsZRM = !!parsed.zrm;
                needsPolice = !!parsed.pol;
              } catch (err) {
                console.error("Błąd AI, powrót do generatora offline:", err);
              }
            }

            if (!text) {
              location = \`\${city}, ul. \${street} \${houseNum}\`;
              text = "Proszę o interwencję. Pali się na mojej posesji.";
              expectedKdrMsg = "Rozpoznanie: sytuacja opanowana, brak dodatkowych zagrożeń.";
              if (type === 'mz') {
                text = "Doszło do wypadku. Potrzebna pomoc służb.";
                expectedKdrMsg = "Rozpoznanie: wypadek drogowy, udzielono KPP.";
              } else if (type === 'af') {
                text = "Widzę dym z okna sąsiada!";
                expectedKdrMsg = "Rozpoznanie: alarm fałszywy, brak pożaru.";
              }
            }`;

const replacementGeneratorAI = `                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt,
                });
                let textResp = response.text;
                if (textResp.includes("\`\`\`json")) {
                  textResp = textResp.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
                } else if (textResp.includes("\`\`\`")) {
                  textResp = textResp.replace(/\`\`\`/g, '').trim();
                }
                const parsed = JSON.parse(textResp);
                location = parsed.adres || \`\${city}, ul. \${street} \${houseNum}\`;
                text = parsed.t || "Zgłoszenie bez opisu.";
                expectedKdrMsg = parsed.k || "Brak meldunku.";
                needsZRM = !!parsed.zrm;
                needsPolice = !!parsed.pol;
              } catch (err) {
                console.error("Błąd AI, powrót do generatora offline:", err);
              }
            }

            if (!text) {
              const roadNum = Math.floor(Math.random() * 90) + 10;
              const pikietaz = \`\${Math.floor(Math.random() * 300)}+\${Math.floor(Math.random() * 9) * 100}\`;
              
              if (type === 'pozar') {
                const pozScen = [
                  { loc: \`\${city}, ul. \${street} \${houseNum}\`, t: "Dzień dobry, z okna na drugim piętrze wydobywa się czarny dym. Ktoś chyba wzywał pomocy, szybko!", k: "Rozpoznanie: Rozwinięty pożar mieszkania na 2. piętrze. Jedna osoba ewakuowana. Podano 2 prądy w natarciu." },
                  { loc: \`\${city}, Skrzyżowanie ul. \${street} i ul. \${randomElement(activeStreets)}\`, t: "Pali się samochód na środku skrzyżowania. Kierowca uciekł, ale blokuje cały pas.", k: "Rozpoznanie: Pożar komory silnika samochodu osobowego. Pożar zgaszono 1 prądem piany ciężkiej." },
                  { loc: \`\${city}, Kompleks leśny, dojazd od ul. \${street}\`, t: "Palą się trawy i poszycie leśne na obrzeżach lasu. Ogień szybko się rozprzestrzenia przez wiatr.", k: "Rozpoznanie: Pożar poszycia na obszarze ok. 20 arów. Zagrożenie dla młodnika. Zbudowano linię gaśniczą 400m." }
                ];
                const s = randomElement(pozScen);
                location = s.loc; text = s.t; expectedKdrMsg = s.k;
              } else if (type === 'mz') {
                const mzScen = [
                  { loc: \`Droga Krajowa \${roadNum}, Pikietaż: \${pikietaz} km, rejon \${city}\`, t: "Wypadek drogowy, zderzenie czołowe dwóch osobówek! Kierowca jest zakleszczony w pojeździe, potrzebne pogotowie!", k: "Rozpoznanie: Zderzenie czołowe dwóch aut. Jedna osoba zakleszczona - wykonujemy dostęp przy użyciu narzędzi hydraulicznych. DK zablokowana." },
                  { loc: \`\${city}, ul. \${street} \${houseNum}\`, t: "Mocno czuć gaz na klatce schodowej. Ludzie zaczynają wychodzić z mieszkań.", k: "Rozpoznanie: Wyczuwalna woń gazu. Pomiary potwierdziły stężenie wybuchowe. Ewakuowano 15 osób. Zakręcono zawór główny." },
                  { loc: \`\${city}, odcinek drogi ul. \${street}\`, t: "Potężne drzewo przewróciło się na drogę i uszkodziło linię energetyczną. Przewody iskrzą!", k: "Rozpoznanie: Wiatrołom blokujący dwa pasy. Uszkodzona linia nN - zabezpieczono teren, oczekujemy na Pogotowie Energetyczne." }
                ];
                const s = randomElement(mzScen);
                location = s.loc; text = s.t; expectedKdrMsg = s.k;
              } else if (type === 'af') {
                location = \`\${city}, ul. \${street} \${houseNum}\`;
                text = "Chyba coś się pali obok magazynu, widzę dużo pary i dymu.";
                expectedKdrMsg = "Rozpoznanie: Zgłoszenie w dobrej wierze. Dym okazał się być parą technologiczną z chłodni. AF.";
              }
            }`;

if (content.includes("let textResp = response.text.replace(/```json/g")) {
    content = content.replace(targetGeneratorAI, replacementGeneratorAI);
} else {
    // try finding without escaping
    content = content.replace(/let textResp = response.text.replace\(\/```json\/g, ''\).replace\(\/```\/g, ''\).trim\(\);([\s\S]*?)Rozpoznanie: alarm fałszywy, brak pożaru."\n              }\n            }/, replacementGeneratorAI);
}

fs.writeFileSync(file, content);
console.log("Generator patch applied!");
