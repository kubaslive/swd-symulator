const fs = require('fs');

// 1. Fix CSS Grid and Table wrapping
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace('grid-template-rows: 50% 1fr;', 'grid-template-rows: 35% 1fr;');

// Add wrap rules for bufor table
if (!css.includes('.bufor-table')) {
  css += `
.bufor-table td {
  white-space: normal !important;
  word-wrap: break-word;
  padding: 4px !important;
}
`;
}
fs.writeFileSync('src/index.css', css);

// 2. Fix msg.message -> msg.text and WCPR table classes
let code = fs.readFileSync('src/App.jsx', 'utf8');

// fix msg
code = code.replace(/msg\.message/g, "msg.text");

// find WCPR table to add bufor-table class
code = code.replace('<table className="swd-table" style={{ width: \'100%\', fontSize: \'10px\' }}>', '<table className="swd-table bufor-table" style={{ width: \'100%\', fontSize: \'10px\', tableLayout: \'auto\' }}>');

fs.writeFileSync('src/App.jsx', code);
console.log("Issues patched");
