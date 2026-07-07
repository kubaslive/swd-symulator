const fs = require('fs');
let content = fs.readFileSync('src/SisEditor.jsx', 'utf8');

// Replace win-btn with btn-win
content = content.replace(/className="win-btn"/g, 'className="btn-win"');

// Fix Tab Buttons
content = content.replace(
  /<button className="btn-win" onClick=\{\(\) => setActiveTab\('jrg'\)\} style=\{\{ background: activeTab === 'jrg' \? '#fff' : '', fontWeight: activeTab === 'jrg' \? 'bold' : 'normal' \}\}>JRG<\/button>/g,
  '<button className={`tab-btn ${activeTab === "jrg" ? "active" : ""}`} onClick={() => setActiveTab("jrg")}>JRG</button>'
);

content = content.replace(
  /<button className="btn-win" onClick=\{\(\) => setActiveTab\('osp'\)\} style=\{\{ background: activeTab === 'osp' \? '#fff' : '', fontWeight: activeTab === 'osp' \? 'bold' : 'normal' \}\}>OSP<\/button>/g,
  '<button className={`tab-btn ${activeTab === "osp" ? "active" : ""}`} onClick={() => setActiveTab("osp")}>OSP</button>'
);

content = content.replace(
  /<button className="btn-win" onClick=\{\(\) => setActiveTab\('vehicles'\)\} style=\{\{ background: activeTab === 'vehicles' \? '#fff' : '', fontWeight: activeTab === 'vehicles' \? 'bold' : 'normal' \}\}>Pojazdy<\/button>/g,
  '<button className={`tab-btn ${activeTab === "vehicles" ? "active" : ""}`} onClick={() => setActiveTab("vehicles")}>Pojazdy</button>'
);

fs.writeFileSync('src/SisEditor.jsx', content);
console.log('Fixed button styles in SisEditor.jsx');
