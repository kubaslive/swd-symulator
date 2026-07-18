const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const targetListBadge = `                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>`;
const replaceListBadge = `                    <div style={{ flex: 1 }}>
                      {inc.requiredSgr && !inc.sgrFulfilled && <div style={{ fontSize: '10px', color: '#c92a2a', fontWeight: 'bold', marginBottom: '2px' }}>[WYMAGA SGR: {inc.requiredSgr}]</div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>`;

code = code.replace(targetListBadge, replaceListBadge);
fs.writeFileSync('src/App.jsx', code);
