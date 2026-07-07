const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Incidents query
content = content.replace(/q = query\(\n        incidentsRef, \n        where\('ospUnit', '==', userProfile.ospUnit\), \n        orderBy\('createdAt', 'desc'\)\n      \);/, 
  "q = query(incidentsRef, where('tenantId', '==', userProfile.tenantId), where('ospUnit', '==', userProfile.ospUnit));");

content = content.replace(/q = query\(\n        incidentsRef, \n        where\('targetJrg', '==', userProfile.jrgUnit\), \n        orderBy\('createdAt', 'desc'\)\n      \);/, 
  "q = query(incidentsRef, where('tenantId', '==', userProfile.tenantId), where('targetJrg', '==', userProfile.jrgUnit));");

content = content.replace(/q = query\(incidentsRef, orderBy\('createdAt', 'desc'\)\);/g, 
  "q = query(incidentsRef, where('tenantId', '==', userProfile.tenantId));");

// 2. Calls query
content = content.replace(/const q = query\(callsRef, where\('status', '==', 'pending'\)\);/g, 
  "const q = query(callsRef, where('tenantId', '==', userProfile.tenantId), where('status', '==', 'pending'));");

// 3. Messages query
content = content.replace(/const msgRef = collection\(db, 'messages'\);\n    const q = query\(msgRef, orderBy\('createdAt', 'desc'\)\);/g, 
  "const msgRef = collection(db, 'messages');\n    const q = query(msgRef, where('tenantId', '==', userProfile.tenantId));");

// 4. addDoc queries
content = content.replace(/addDoc\(collection\(db, 'calls'\), \{/g, "addDoc(collection(db, 'calls'), {\n              tenantId: userProfile?.tenantId || '',");
content = content.replace(/addDoc\(collection\(db, 'incidents'\), \{/g, "addDoc(collection(db, 'incidents'), {\n          tenantId: userProfile?.tenantId || '',");
content = content.replace(/addDoc\(collection\(db, 'messages'\), \{/g, "addDoc(collection(db, 'messages'), {\n        tenantId: userProfile?.tenantId || '',");

fs.writeFileSync('src/App.jsx', content);
console.log('Fixed tenant isolation');
