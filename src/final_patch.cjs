const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const target2 = `        )}

        {isSettingsOpen && (`;

const replacement2 = `        )}

        {isSisEditorOpen && (
          <SisEditor
            db={db}
            userProfile={userProfile}
            onClose={() => setIsSisEditorOpen(false)}
            tenantJrgUnits={tenantJrgUnits}
            tenantOspUnits={tenantOspUnits}
            tenantVehicles={tenantVehicles}
          />
        )}

        {isSettingsOpen && (`;

if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    fs.writeFileSync(file, content);
    console.log("Success SisEditor Render");
} else {
    console.log("Target 2 not found");
}
