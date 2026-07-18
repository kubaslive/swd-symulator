const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

// Change Fluent variables to Classic Gray
css = css.replace('--win-bg: #f3f3f3;', '--win-bg: #d4d0c8;');
css = css.replace('--win-face: rgba(255, 255, 255, 0.7);', '--win-face: #d4d0c8;');
css = css.replace('--win-face-solid: #ffffff;', '--win-face-solid: #d4d0c8;');
css = css.replace('background-color: #ffffff;', 'background-color: #d4d0c8;'); // For .swd-table td, etc.
css = css.replace('backdrop-filter: blur(20px);', '/* backdrop-filter removed for classic look */');
css = css.replace('-webkit-backdrop-filter: blur(20px);', '');

fs.writeFileSync('src/index.css', css);


let app = fs.readFileSync('src/App.jsx', 'utf8');
// Many inline backgrounds are #ffffff or #f3f3f3. Let's make them classic gray.
app = app.replace(/background: '#ffffff'/g, "background: '#e0dfde'");
app = app.replace(/background: '#f3f3f3'/g, "background: '#d4d0c8'");
app = app.replace(/background: '#f0f0f0'/g, "background: '#d4d0c8'");
app = app.replace(/backgroundColor: '#ffffff'/g, "backgroundColor: '#e0dfde'");
app = app.replace(/backgroundColor: '#f3f3f3'/g, "backgroundColor: '#d4d0c8'");

fs.writeFileSync('src/App.jsx', app);
console.log("Made it gray");
