const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(
  /const uProf = docSnap\.data\(\);/,
  "const uProf = { ...docSnap.data() };"
);

fs.writeFileSync('src/App.jsx', content);
