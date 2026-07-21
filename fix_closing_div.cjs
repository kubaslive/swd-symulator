const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');
content = content.replace(/<\/table>\s*<\/div>\s*\{\/\* Dziennik Korespondencji Radiowej/m, "</table>\n</div>\n              </div>\n\n              {/* Dziennik Korespondencji Radiowej");
fs.writeFileSync('src/App.jsx', content);
