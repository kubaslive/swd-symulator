const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(
  `tenantUnitCoordinates={tenantUnitCoordinates}`,
  `tenantUnitCoordinates={tenantUnitCoordinates}\n              tenantOdwody={tenantOdwody}`
);

fs.writeFileSync('src/App.jsx', code);
