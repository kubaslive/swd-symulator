const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(/m\. Katowice/g, 'm. ${tenantName}');
content = content.replace(/'Katowice'/g, 'tenantName');
content = content.replace(/"Katowice"/g, 'tenantName');
content = content.replace(/WCPR Katowice/g, 'WCPR ${tenantName}');
content = content.replace(/Węzeł Katowice/g, 'Węzeł ${tenantName}');
content = content.replace(/KW PSP Katowice/g, 'KW PSP');
content = content.replace(/SKKM Katowice/g, 'Dyspozytornia');
content = content.replace(/KM Katowice/g, 'KM/KP PSP');

fs.writeFileSync('src/App.jsx', content);
console.log('Fixed more Katowice');
