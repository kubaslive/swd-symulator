const fs = require('fs');
const file = '/Users/grucha/Documents/SWD 2.0/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        {activeMenuTab === 'konta' && userProfile && userProfile?.role === 'admin' ? (
          renderAdminDashboard()`;

const replacement = `        {['konta', 'game_master', 'scenariusze'].includes(activeMenuTab) && userProfile && userProfile?.role === 'admin' ? (
          renderAdminDashboard()`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Success admin tab fix");
} else {
    console.log("Target not found");
}
