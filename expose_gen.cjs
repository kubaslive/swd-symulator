const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('window.triggerGen = generateAndAddIncident;')) {
  content = content.replace(
    'generateAndAddIncident();',
    'generateAndAddIncident();\n        window.triggerGen = generateAndAddIncident;'
  );
  fs.writeFileSync(file, content);
}
