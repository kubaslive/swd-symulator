const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(
  /await updateDoc\(tenantRef, \{ vehicles: newVehicles \}\);/g,
  "await setDoc(tenantRef, { vehicles: newVehicles }, { merge: true });"
);

content = content.replace(
  /await updateDoc\(tenantRef, \{ jrgUnits: jrg, ospUnits: osp \}\);/g,
  "await setDoc(tenantRef, { jrgUnits: jrg, ospUnits: osp }, { merge: true });"
);

fs.writeFileSync('src/App.jsx', content);
