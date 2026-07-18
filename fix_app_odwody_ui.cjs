const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const target1 = `                      <span style={{ fontSize: '8px', background: grp.type.includes('Specjalistyczna') ? '#101113' : '#1864ab', color: 'white', padding: '1px 3px', borderRadius: '2px' }}>{grp.type}</span>`;
const replace1 = `                      <span style={{ fontSize: '8px', background: grp.type?.includes('Specjalistyczna') ? '#101113' : '#1864ab', color: 'white', padding: '1px 3px', borderRadius: '2px' }}>{grp.type || 'Grupa Operacyjna'}</span>`;
code = code.replace(target1, replace1);

const target2 = `                            <span className="led-indicator green" style={{ width: 6, height: 6 }} />`;
const replace2 = `                            {renderTable4StatusIcon(vStr.split(' | ')[0], vStr.split(' | ')[1])}`;
code = code.replace(target2, replace2);

fs.writeFileSync('src/App.jsx', code);
