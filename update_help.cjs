const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update handleSaveSettings to save API key to localStorage and remove from Firestore upload
const handleSaveRegex = /const handleSaveSettings = async \(\) => \{([\s\S]*?)console\.error\("Błąd zapisywania ustawień:", err\);/;
const handleSaveReplacement = `const handleSaveSettings = async () => {
    try {
      if (settingsData.geminiApiKey) {
        localStorage.setItem('geminiApiKey', settingsData.geminiApiKey);
      } else {
        localStorage.removeItem('geminiApiKey');
      }

      if (!userProfile) return;
      const safeSettings = { ...settingsData };
      delete safeSettings.geminiApiKey; // Nie wysyłamy klucza do bazy danych

      await updateDoc(doc(db, 'users', userProfile.uid), {
        settings: safeSettings
      });
      logAction(\`[Ustawienia] Zapisano nową konfigurację użytkownika.\`);
      setIsSettingsModalOpen(false);
      
      // Update local tenantName immediately if it was changed
      if (settingsData.kmkpName) {
        setTenantName(settingsData.kmkpName);
      }
    } catch (err) {
      console.error("Błąd zapisywania ustawień:", err);`;

content = content.replace(handleSaveRegex, handleSaveReplacement);

// 2. Load API key from localStorage when settings open
const openSettingsRegex = /const openSettingsModal = \(\) => \{([\s\S]*?)geminiApiKey: userProfile\?.settings\?.geminiApiKey \|\| '',([\s\S]*?)setIsSettingsModalOpen\(true\);\n  \};/;
const openSettingsReplacement = `const openSettingsModal = () => {$1geminiApiKey: localStorage.getItem('geminiApiKey') || '',$2setIsSettingsModalOpen(true);\n  };`;
content = content.replace(openSettingsRegex, openSettingsReplacement);

// 3. Update the generator usage to read from localStorage instead of settingsData
const generatorRegex = /if \(settingsData\?\.geminiApiKey\) \{/g;
content = content.replace(generatorRegex, `const localGeminiKey = localStorage.getItem('geminiApiKey');\n            if (localGeminiKey) {`);

const aiInitRegex = /const ai = new GoogleGenAI\(\{ apiKey: settingsData\.geminiApiKey \}\);/g;
content = content.replace(aiInitRegex, `const ai = new GoogleGenAI({ apiKey: localGeminiKey });`);

// 4. Update the Pomoc modal
const helpRegex = /<li><strong>Tryb Gry:<\/strong> Możesz go włączyć w pasku na górze. Wpisz nazwy miast z Twojego powiatu \(po przecinku\), aby system generował zgłoszenia i wezwania z tych miejscowości\.<\/li>\n              <\/ul>/;
const helpReplacement = `<li><strong>Tryb Gry:</strong> Możesz go włączyć w pasku na górze. Wpisz nazwy miast z Twojego powiatu (po przecinku), aby system generował zgłoszenia i wezwania z tych miejscowości.</li>
                <li><strong style={{color:'#005fb8'}}>Generator AI (Gemini):</strong> Zdarzenia mogą być wymyślane przez Sztuczną Inteligencję! W tym celu wejdź w Ustawienia -> Wklej klucz API. Jak go zdobyć? Wejdź na <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color: 'blue', textDecoration: 'underline'}}>Google AI Studio</a>, zaloguj się kontem Google, kliknij "Create API key" i wklej go do gry. Klucz jest zapisywany w 100% bezpiecznie TYLKO na Twoim dysku (localStorage).</li>
              </ul>`;
content = content.replace(helpRegex, helpReplacement);

fs.writeFileSync(file, content);
console.log("Fix applied!");
