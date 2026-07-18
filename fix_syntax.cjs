const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Remove the extra </div> before </footer>
code = code.replace('  </div>\n</footer>', '</footer>');

// 2. Remove the old Dziennik Radiowy entirely
const oldDRStart = '{/* --- DZIENNIK RADIOWY WIDGET --- */}';
const nextCommentStart = '{/* Global overlay for context menu */}'; // wait, what is after?
// Let's just find the end of Dziennik Radiowy
const oldDREnd = '  {/* MAP MODAL */}';
const startIndex = code.indexOf(oldDRStart);
let endIndex = code.indexOf('          </div>\n        )}\n\n        {/* MAP MODAL */}');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + code.substring(endIndex + 21);
} else {
  // If not found, try to locate it manually
  let lines = code.split('\n');
  let startLine = lines.findIndex(l => l.includes('--- DZIENNIK RADIOWY WIDGET ---'));
  let endLine = startLine;
  let divCount = 0;
  if (startLine !== -1) {
    for (let i = startLine; i < lines.length; i++) {
       if (lines[i].includes('position: \'fixed\', bottom: \'26px\'')) divCount++;
       if (lines[i].includes('<div')) divCount += (lines[i].match(/<div/g) || []).length;
       if (lines[i].includes('</div')) divCount -= (lines[i].match(/<\/div/g) || []).length;
       
       if (divCount === 0 && i > startLine + 5) {
         endLine = i;
         break;
       }
    }
    
    // Also remove any dangling isRadioLogOpen && ( ... )} if they weren't caught
    lines.splice(startLine, endLine - startLine + 1);
    code = lines.join('\n');
  }
}

fs.writeFileSync('src/App.jsx', code);
console.log("Syntax fixed");
