const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Replace hardcoded legacy colors with modern variables
code = code.replace(/background: '#f3f3f3'/g, "background: 'var(--win-face)'");
code = code.replace(/background: '#d4d0c8'/g, "background: 'var(--win-face)'");
code = code.replace(/background: '#c0c0c0'/g, "background: 'var(--win-face)'");
code = code.replace(/border: '2px solid inset'/g, "border: '1px solid var(--win-shadow)', borderRadius: '4px'");
code = code.replace(/border: '2px inset #d1d1d1'/g, "border: '1px solid var(--win-shadow)', borderRadius: '4px'");
code = code.replace(/border-double-outset/g, "border-outset");

fs.writeFileSync('src/App.jsx', code);
