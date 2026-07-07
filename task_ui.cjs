const fs = require('fs');
let content = fs.readFileSync('/Users/grucha/.gemini/antigravity/brain/c44bb2e3-04e1-44f9-a4fd-20a8b1e4713b/task.md', 'utf8');

content = content.replace(
  /- \`\[ \]\` Usunięcie renderInteractiveMap z głównego widoku./,
  '- `[x]` Usunięcie renderInteractiveMap z głównego widoku.'
);
content = content.replace(
  /- \`\[ \]\` Przebudowa \`combat-main-layout\` na układ horyzontalny/,
  '- `[x]` Przebudowa `combat-main-layout` na układ horyzontalny'
);
content = content.replace(
  /- \`\[ \]\` Wstrzykiwanie domyślnych danych JRG i Pojazdów podczas rejestracji nowego najemcy, aby baza nie była pusta./,
  '- `[x]` Wstrzykiwanie domyślnych danych JRG i Pojazdów podczas rejestracji nowego najemcy, aby baza nie była pusta.'
);
content = content.replace(
  /- \`\[ \]\` Dodanie paska narzędziowego SWD nad rejestrem zdarzeń./,
  '- `[x]` Dodanie paska narzędziowego SWD nad rejestrem zdarzeń.'
);

fs.writeFileSync('/Users/grucha/.gemini/antigravity/brain/c44bb2e3-04e1-44f9-a4fd-20a8b1e4713b/task.md', content);
