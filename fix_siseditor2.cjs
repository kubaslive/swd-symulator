const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

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
}
`;

if (!content.includes('<SisEditor')) {
  content = content.replace(/    <\/div>\n  \);\n\}\n/g, renderComponent + '\n');
  fs.writeFileSync('src/App.jsx', content);
  console.log('SisEditor rendering added.');
} else {
  console.log('Already added.');
}
