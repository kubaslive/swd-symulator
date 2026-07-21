const fs = require('fs');
const code = fs.readFileSync('src/App.jsx', 'utf8');

const lines = code.split('\n');
let depth = 0;
let divOpened = -1;

for (let i = 8906; i < 9250; i++) {
  const line = lines[i];
  if (!line) continue;
  
  if (line.includes('<div style={{ flex: 1, overflowY: \'auto\', display: incidentModalTab === \'formatka\' ? \'block\' : \'none\' }}>')) {
    depth = 1;
    divOpened = i;
    console.log(`[${i+1}] OPENED`);
    continue;
  }
  
  if (depth > 0) {
    // Count simple <div and </div occurrences
    const opens = (line.match(/<div/g) || []).length;
    // But some are <div />
    const selfClosing = (line.match(/<div[^>]*\/>/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    
    depth += opens - selfClosing - closes;
    if (depth === 0) {
      console.log(`[${i+1}] CLOSED`);
      break;
    }
  }
}
