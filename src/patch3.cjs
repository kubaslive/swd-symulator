const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('<SisEditor')) {
    content = content.replace(
        `{isSettingsOpen && (`,
        `{isSisEditorOpen && (
          <SisEditor
            db={db}
            userProfile={userProfile}
            onClose={() => setIsSisEditorOpen(false)}
            tenantJrgUnits={tenantJrgUnits}
            tenantOspUnits={tenantOspUnits}
            tenantVehicles={tenantVehicles}
          />
        )}

        {isSettingsOpen && (`
    );
    fs.writeFileSync(file, content);
    console.log("Patched SisEditor!");
} else {
    console.log("Already patched.");
}
