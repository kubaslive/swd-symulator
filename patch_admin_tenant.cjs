const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(
  /tenantId: regRole === 'kdr_osp' \? selectedOsp : regRole === 'pa_jrg' \? selectedJrg : '',/g,
  "tenantId: regRole === 'admin' ? uid : (regRole === 'kdr_osp' ? selectedOsp : selectedJrg),"
);

fs.writeFileSync('src/App.jsx', content);
console.log('Admin tenantId assignment fixed.');
