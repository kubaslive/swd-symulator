const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Fix incidents sorting
content = content.replace(/setIncidents\(items\);/, `
      items.sort((a, b) => {
        const tA = a.createdAt ? (a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime()) : 0;
        const tB = b.createdAt ? (b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime()) : 0;
        return tB - tA;
      });
      setIncidents(items);
`);

// Fix messages sorting
// Find the msgRef snapshot callback
content = content.replace(/const reversed = items\.slice\(0, 30\)\.reverse\(\);/g, `
      items.sort((a, b) => {
        const tA = a.createdAt ? (a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime()) : 0;
        const tB = b.createdAt ? (b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime()) : 0;
        return tB - tA;
      });
      const reversed = items.slice(0, 30).reverse();
`);

fs.writeFileSync('src/App.jsx', content);
console.log('Fixed sorting');
