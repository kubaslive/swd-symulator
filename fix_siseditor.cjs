const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Import
content = content.replace(/import \{ auth, db \} from '\.\/firebase';\n/, "import { auth, db } from './firebase';\nimport SisEditor from './SisEditor';\n");

// 2. State
content = content.replace(/const \[isSystemMenuOpen, setIsSystemMenuOpen\] = useState\(false\);/, "const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);\n  const [isSisEditorOpen, setIsSisEditorOpen] = useState(false);");

// 3. Menu Item
const menuItem = `
              <div 
                className="menu-item-dropdown" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSystemMenuOpen(false);
                  setIsSisEditorOpen(true);
                }}
                style={{ color: '#000', padding: '4px 10px', fontSize: '11px', textAlign: 'left', cursor: 'pointer', fontWeight: 'bold', color: '#000080' }}
              >
                ⚙️ Edytor Sił i Środków (Baza SiS)
              </div>
              <div style={{ height: '1px', background: '#808080', margin: '2px 0' }} />
              <div 
`;
content = content.replace(/              <div \n                className="menu-item-dropdown" \n                onClick=\{\(e\) => \{\n                  e\.stopPropagation\(\);\n                  setIsSystemMenuOpen\(false\);\n                  handleLogout\(\);\n                \}\}/, menuItem + `                className="menu-item-dropdown" \n                onClick={(e) => {\n                  e.stopPropagation();\n                  setIsSystemMenuOpen(false);\n                  handleLogout();\n                }}`);

// 4. Component Render
const renderComponent = `
      {isSisEditorOpen && (
        <SisEditor 
          db={db}
          userProfile={userProfile}
          tenantJrgUnits={tenantJrgUnits}
          tenantOspUnits={tenantOspUnits}
          tenantVehicles={tenantVehicles}
          onClose={() => setIsSisEditorOpen(false)}
        />
      )}
    </div>
  );
};
`;
content = content.replace(/    <\/div>\n  \);\n\};\n\nexport default App;/g, renderComponent + `\nexport default App;`);

fs.writeFileSync('src/App.jsx', content);
console.log('SisEditor integrated');
