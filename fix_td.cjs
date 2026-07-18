const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

// The color `#555` is used for time string
code = code.replace("<td style={{ color: isSelected ? 'inherit' : '#555' }}>", "<td>");
// #555 used for subtype
code = code.replace("color: '#555', background: '#f1f3f5', border: '1px solid #ced4da'", "color: '#000', background: '#d4d0c8', border: '1px solid #ced4da'");

// Also let's fix the Clock!
// The bottom layout contains Terminale Statusów and Transmisja
// We need to add the huge clock.
// First, let's see where activeMenuTab === 'katalog_sis' is used, and find the bottom panel.

fs.writeFileSync('src/App.jsx', code);
console.log("TD patched");
