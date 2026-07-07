const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Unlock Siły i środki for all roles (or at least dyspozytor)
content = content.replace(
  /\{userProfile && \(userProfile\?\.role === 'admin' \|\| userProfile\?\.role === 'pa_jrg'\) && \(\n\s*<div className=\{`menu-item \$\{activeMenuTab === 'katalog_sis' \? 'active' : ''\}`\} onClick=\{\(\) => setActiveMenuTab\('katalog_sis'\)\}>Siły i środki<\/div>\n\s*\)\}/,
  `<div className={\`menu-item \${activeMenuTab === 'katalog_sis' ? 'active' : ''}\`} onClick={() => setActiveMenuTab('katalog_sis')}>Siły i środki</div>`
);

fs.writeFileSync('src/App.jsx', content);
console.log('Patched menu to show Katalog SiS for all users');
