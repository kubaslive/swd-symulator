const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace('.black-table td {\n  border-right: 1px solid #333 ;\n  border-bottom: 1px solid #333 ;\n  background-color: #000 ;\n  color: #00ff00 ;\n}', '.black-table td {\n  border-right: 1px solid #333 ;\n  border-bottom: 1px solid #333 ;\n  background-color: inherit ;\n  color: inherit ;\n}');
fs.writeFileSync('src/index.css', css);
