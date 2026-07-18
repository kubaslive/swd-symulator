const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(
  `needsPolice: !!scenarioObj.pol,`,
  `needsPolice: !!scenarioObj.pol,\n              requiredSgr: scenarioObj.requiredSgr || null,`
);

fs.writeFileSync('src/App.jsx', code);
