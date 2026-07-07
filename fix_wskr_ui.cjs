const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Modifying Incident List Rendering
content = content.replace(/{inc\.location}/g, "{userProfile?.role === 'admin' && inc.tenantId ? `[${inc.tenantId}] ` : ''}{inc.location}");

// Modifying Calls Queue Rendering
// 1. In list view
content = content.replace(/{call\.location}/g, "{userProfile?.role === 'admin' && call.tenantId ? `[${call.tenantId}] ` : ''}{call.location}");

fs.writeFileSync('src/App.jsx', content);
console.log('WSKR UI updated');
