const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

app = app.replace(/className="combat-column" style={{ background: '#e0dfde' }}/g, 'className="combat-column" style={{ background: \'#ffffff\' }}');
app = app.replace(/className="combat-column" style={{ background: '#d4d0c8' }}/g, 'className="combat-column" style={{ background: \'#ffffff\' }}');

fs.writeFileSync('src/App.jsx', app);
