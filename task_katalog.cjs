const fs = require('fs');
let content = fs.readFileSync('/Users/grucha/.gemini/antigravity/brain/c44bb2e3-04e1-44f9-a4fd-20a8b1e4713b/task.md', 'utf8');

content += `
- \`[/]\` Krok 6: Integracja natywnego Katalogu SiS i Bufora
  - \`[ ]\` Usunięcie komponentu SisEditor i jego wywołania.
  - \`[ ]\` Zamiana \`vehiclesCatalog\` na \`tenantVehicles\` w renderKatalogSiS.
  - \`[ ]\` Dodanie funkcji zapisu do Firebase podczas edycji pojazdów w Katalogu.
  - \`[ ]\` Dodanie sekcji 'Zarządzanie Jednostkami' w Katalogu SiS (Dodawanie KM/KP/OSP).
  - \`[ ]\` Odblokowanie przycisku "Bufor zdarzeń" w panelu SiS (przekierowanie do modułu Bufor Meldunków).
`;
fs.writeFileSync('/Users/grucha/.gemini/antigravity/brain/c44bb2e3-04e1-44f9-a4fd-20a8b1e4713b/task.md', content);
console.log('Task list updated');
