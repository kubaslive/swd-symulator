const fs = require('fs');
let code = fs.readFileSync('src/SisEditor.jsx', 'utf8');

code = code.replace(/background: '#f3f3f3'/g, "background: 'var(--win-face)'");
code = code.replace(/background: '#d4d0c8'/g, "background: 'var(--win-face)'");
code = code.replace(/border: '2px solid inset'/g, "border: '1px solid var(--win-shadow)', borderRadius: '4px'");
code = code.replace(/border-double-outset/g, "border-outset");

fs.writeFileSync('src/SisEditor.jsx', code);
