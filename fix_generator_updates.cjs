const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf-8');

const regex = /requiredUnits: scenarioObj\.requiredUnits \|\| null,/;
content = content.replace(regex, `requiredUnits: scenarioObj.requiredUnits || null,
              updates: scenarioObj.updates || [],
              processedUpdates: 0,`);

fs.writeFileSync('src/App.jsx', content);
