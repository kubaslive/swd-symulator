const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf-8');

content = content.replace("activeIncident.tenantId?.substring", "activeIncident?.tenantId?.substring");

fs.writeFileSync('src/App.jsx', content);
