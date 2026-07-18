const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(
  "const generateAndAddIncident = async () => {\n          if (!window._triggerManualWCPR) window._triggerManualWCPR = generateAndAddIncident;",
  "const generateAndAddIncident = async () => {"
);

// We should assign window._triggerManualWCPR = generateAndAddIncident outside the function, 
// but inside the useEffect where it's defined. Let's find where generateAndAddIncident ends.
// Wait, generateAndAddIncident is used inside useEffect for WCPR incidents.
// We can just add it right before it's used or right after definition.
// It's used at: `generateAndAddIncident();` or `setInterval(generateAndAddIncident, ...)`
