const fs = require('fs');
let code = fs.readFileSync('src/SisEditor.jsx', 'utf8');

// Fix potential non-iterable jrgUnits/ospUnits
code = code.replace(/const \[jrgUnits, setJrgUnits\] = useState\(\[\.\.\.\(tenantJrgUnits \|\| \[\]\)\]\);/g, 
  "const [jrgUnits, setJrgUnits] = useState(Array.isArray(tenantJrgUnits) ? [...tenantJrgUnits] : Object.values(tenantJrgUnits || {}));");
code = code.replace(/const \[ospUnits, setOspUnits\] = useState\(\[\.\.\.\(tenantOspUnits \|\| \[\]\)\]\);/g, 
  "const [ospUnits, setOspUnits] = useState(Array.isArray(tenantOspUnits) ? [...tenantOspUnits] : Object.values(tenantOspUnits || {}));");

// Fix in useEffect
code = code.replace(/setJrgUnits\(\[\.\.\.\(tenantJrgUnits \|\| \[\]\)\]\);/g, 
  "setJrgUnits(Array.isArray(tenantJrgUnits) ? [...tenantJrgUnits] : Object.values(tenantJrgUnits || {}));");
code = code.replace(/setOspUnits\(\[\.\.\.\(tenantOspUnits \|\| \[\]\)\]\);/g, 
  "setOspUnits(Array.isArray(tenantOspUnits) ? [...tenantOspUnits] : Object.values(tenantOspUnits || {}));");

// Fix vehicles map
code = code.replace(/\{\(vehicles\[selectedUnit\] \|\| \[\]\)\.map/g, 
  "{(Array.isArray(vehicles[selectedUnit]) ? vehicles[selectedUnit] : Object.values(vehicles[selectedUnit] || {})).map");

fs.writeFileSync('src/SisEditor.jsx', code);
