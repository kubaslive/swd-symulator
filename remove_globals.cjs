const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Remove globals
content = content.replace(/\/\/ Katowice SWD units[\s\S]*?const SIMULATED_HYDRANTS = \[\n(?:.*?\n)*?\];\n/, '');

// Remove getNearbyHydrants
content = content.replace(/\/\/ Calculates distances to hydrants dynamically\nconst getNearbyHydrants = \(locStr\) => \{\n(?:.*?\n)*?\}\;\n/, '');

fs.writeFileSync('src/App.jsx', content);
console.log('Globals removed');
