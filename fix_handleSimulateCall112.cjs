const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(/const \[tenantStreets, setTenantStreets\] = useState\(\[\]\);/, `const [tenantStreets, setTenantStreets] = useState([]);\n  const [tenantName, setTenantName] = useState('');`);
content = content.replace(/setTenantStreets\(data.streets \|\| \[\]\);/, `setTenantStreets(data.streets || []);\n        setTenantName(data.name || 'Twoje Miasto');`);

content = content.replace(/const streets = \[\n          "Korfantego", "Szopienicka", "Piotrowicka", "Chorzowska", "3 Maja", "Bankowa", "Kościuszki", "Gliwicka", "Warszawska", "Roździeńskiego", "Jankego", "Oswobodzenia", "Ligocka", "Mariacka", "Sokolska", "Francuska", "Mikołowska", "Armii Krajowej", "Brynowska", "Panewnicka", "Bocheńskiego", "Lwowska", "Krakowska", "Gospodarcza", "Murckowska", "Owsiana", "Bażantów", "Załęska", "Ochojecka", "Ziołowa", "Bielska"\n        \];\n/, `const streets = tenantStreets.length > 0 ? tenantStreets : ["Główna", "Polna", "Leśna"];\n`);

content = content.replace(/const location = \`Katowice, ul\. \$\{street\} \$\{houseNum\}\`;/g, 'const location = `${tenantName}, ul. ${street} ${houseNum}`;');
content = content.replace(/LOKALIZACJA PLI CBD: Gmina m\. Katowice, ul\. \$\{street\} \$\{houseNum\}/g, 'LOKALIZACJA PLI CBD: Gmina m. ${tenantName}, ul. ${street} ${houseNum}');

fs.writeFileSync('src/App.jsx', content);
console.log('Fixed handleSimulateCall112');
