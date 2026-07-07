const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Fix single quotes wrapping template literals
content = content.replace(/'m\. \$\{tenantName\}'/g, "\`m. \${tenantName}\`");

fs.writeFileSync('src/App.jsx', content);
console.log('Fixed gmina template literals');
