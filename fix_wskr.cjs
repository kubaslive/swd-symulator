const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// INCIDENTS QUERY
content = content.replace(/if \(userProfile\?\.role === 'kdr_osp' && userProfile\?\.ospUnit\) \{/g, `if (userProfile?.role === 'admin') {
      q = query(incidentsRef); // WSKR: Get all incidents across all tenants
    } else if (userProfile?.role === 'kdr_osp' && userProfile?.ospUnit) {`);

// CALLS QUERY
content = content.replace(/const q = query\(callsRef, where\('tenantId', '==', userProfile.tenantId\), where\('status', '==', 'pending'\)\);/g, `
    let q;
    if (userProfile?.role === 'admin') {
      q = query(callsRef, where('status', '==', 'pending')); // WSKR
    } else {
      q = query(callsRef, where('tenantId', '==', userProfile.tenantId), where('status', '==', 'pending'));
    }
`);

// MESSAGES QUERY
content = content.replace(/const msgRef = collection\(db, 'messages'\);\n    const q = query\(msgRef, where\('tenantId', '==', userProfile.tenantId\)\);/g, `const msgRef = collection(db, 'messages');
    let q;
    if (userProfile?.role === 'admin') {
      q = query(msgRef); // WSKR
    } else {
      q = query(msgRef, where('tenantId', '==', userProfile.tenantId));
    }`);

fs.writeFileSync('src/App.jsx', content);
console.log('WSKR logic applied');
