const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Remove import
content = content.replace(/import SisEditor from '\.\/SisEditor';\n/, '');

// Remove isSisEditorOpen state
content = content.replace(/const \[isSisEditorOpen, setIsSisEditorOpen\] = useState\(false\);\n/, '');

// Remove SisEditor from menu
content = content.replace(/              <div \n                className="menu-item-dropdown" \n                onClick=\{\(e\) => \{\n                  e\.stopPropagation\(\);\n                  setIsSystemMenuOpen\(false\);\n                  setIsSisEditorOpen\(true\);\n                \}\}\n                style=\{\{ color: '#000', padding: '4px 10px', fontSize: '11px', textAlign: 'left', cursor: 'pointer', fontWeight: 'bold', color: '#000080' \}\}\n              >\n                ⚙️ Edytor Sił i Środków \(Baza SiS\)\n              <\/div>\n              <div style=\{\{ height: '1px', background: '#808080', margin: '2px 0' \}\} \/>/, '');

// Remove SisEditor rendering
content = content.replace(/      \{isSisEditorOpen && \(\n        <SisEditor [\s\S]*?\/>\n      \)\}/, '');

fs.writeFileSync('src/App.jsx', content);
console.log('SisEditor removed');
