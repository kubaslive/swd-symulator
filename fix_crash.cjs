const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

app = app.replace(/isConnected \? '#00cc00' : '#cc0000'/g, 'true ? \'#00cc00\' : \'#cc0000\'');
app = app.replace(/isConnected \? 'OK' : 'BŁĄD'/g, 'true ? \'OK\' : \'BŁĄD\'');

fs.writeFileSync('src/App.jsx', app);
console.log("Crash fixed");
