const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace('.dashboard-grid {\n  display: grid;\n  grid-template-rows: auto 1fr;', '.dashboard-grid {\n  display: grid;\n  grid-template-rows: 50% 1fr;');

css += `
/* Black Incident Table */
.black-table {
  background-color: #000 !important;
  color: #00ff00 !important;
}
.black-table th {
  background-color: #d4d0c8 !important;
  color: #000 !important;
  border-right: 1px solid #808080 !important;
  border-bottom: 1px solid #808080 !important;
}
.black-table td {
  border-right: 1px solid #333 !important;
  border-bottom: 1px solid #333 !important;
  background-color: #000 !important;
  color: #00ff00 !important;
}
.black-table tr.selected td {
  background-color: #ff0000 !important;
  color: #ffffff !important;
}
`;

fs.writeFileSync('src/index.css', css);
console.log("CSS patched");
