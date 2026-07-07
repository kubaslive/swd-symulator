const fs = require('fs');
let taskContent = fs.readFileSync('/Users/grucha/.gemini/antigravity/brain/c44bb2e3-04e1-44f9-a4fd-20a8b1e4713b/task.md', 'utf8');
taskContent = taskContent.replace(
  '- `[ ]` Usunięcie dokumentów z kolekcji `tenants`, `incidents`, `messages`, `calls`',
  '- `[x]` Usunięcie dokumentów z kolekcji `tenants`, `incidents`, `messages`, `calls`'
);
taskContent = taskContent.replace(
  '- `[ ]` Przypisanie konta użytkownika do roli WSKR oraz KM PSP Katowice',
  '- `[x]` Przypisanie konta użytkownika do roli WSKR oraz KM PSP Katowice'
);
fs.writeFileSync('/Users/grucha/.gemini/antigravity/brain/c44bb2e3-04e1-44f9-a4fd-20a8b1e4713b/task.md', taskContent);
