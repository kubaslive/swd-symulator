const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Replace "Katowice" strings in JSX and standard strings
content = content.replace(/Katowice, Szopienicka 10/g, "${tenantName}, ul. Główna 1");
content = content.replace(/JRG nr 1 Katowice/g, "JRG 1");
content = content.replace(/JRG nr 2 Katowice/g, "JRG 2");
content = content.replace(/JRG nr 3 Katowice/g, "JRG 3");
content = content.replace(/OSP Katowice-Szopienice/g, "OSP 1");
content = content.replace(/OSP Katowice-Dąbrówka Mała/g, "OSP 2");
content = content.replace(/Dowódcy JRG Katowice/g, "Dowódcy JRG");

content = content.replace(/WCPR KATOWICE/g, "WCPR");
content = content.replace(/SKKM Katowice/g, "SKKM/PSK");
content = content.replace(/SKKM KATOWICE/g, "SKKM/PSK");
content = content.replace(/Katowice ulica\/nr/g, "ulica/nr");
content = content.replace(/KM\/KP Katowice/g, "KM/KP");
content = content.replace(/KATOWICE, dn./g, "${tenantName.toUpperCase()}, dn.");

content = content.replace(/Spodek Katowice/g, "Obiekt 1");
content = content.replace(/>Katowice</g, ">{tenantName}<");

content = content.replace(/\.replace\(' Katowice', ''\)/g, "");
content = content.replace(/\.replace\("Katowice ", ""\)/g, "");

content = content.replace(/Mapa-ST3 Mini \(Katowice\)/g, "Mapa-ST3 Mini ({tenantName})");

fs.writeFileSync('src/App.jsx', content);
console.log('Fixed hardcoded Katowice strings');
