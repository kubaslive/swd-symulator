const fs = require('fs');
const code = fs.readFileSync('src/App.jsx', 'utf8');

const match = code.match(/msg\.time \|\| \[\.\.\.\]/); // roughly
const lines = code.split('\n');
let logLines = lines.filter(l => l.includes('msg.message') || l.includes('msg.from'));
console.log(logLines);
