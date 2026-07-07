const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(
  /setUserProfile\(uProf\);/,
  `if (uProf.role === 'admin' && !uProf.tenantId) { uProf.tenantId = user.uid; }\n        setUserProfile(uProf);`
);

fs.writeFileSync('src/App.jsx', content);
