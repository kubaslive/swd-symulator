const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add import
content = content.replace("import { getRandomStreetWithCoords } from './addressData';", "import { getRandomStreetWithCoords } from './addressData';\nimport { SettingsModal } from './components/SettingsModal';");

// 2. Remove old settings modal
const oldModalRegex = /\{\/\* \-+\n\s*DIALOG MODAL: USTAWIENIA UŻYTKOWNIKA\n\s*\-+\s*\*\/\}[\s\S]*?\{\/\* \-+\n\s*DIALOG MODAL: MAPA GIS/;
const newModalStr = `{/* -------------------------------------------------------------
          DIALOG MODAL: USTAWIENIA UŻYTKOWNIKA (Zewnętrzny komponent)
          ------------------------------------------------------------- */}
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settingsData={settingsData}
        setSettingsData={setSettingsData}
        saveSettings={handleSaveSettings}
      />

      {/* -------------------------------------------------------------
          DIALOG MODAL: MAPA GIS`;

content = content.replace(oldModalRegex, newModalStr);

fs.writeFileSync('src/App.jsx', content);
console.log('App.jsx modal patched!');
