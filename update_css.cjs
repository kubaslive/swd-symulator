const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

// Change root variables to Classic Windows / SWD style
const rootOld = `:root {
  --font-sans: 'Segoe UI Variable', 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
  --font-mono: 'Cascadia Code', 'Consolas', monospace;
  
  /* Windows 11 Fluent Design Light Theme */
  --win-bg: #f3f3f3;
  --win-face: rgba(255, 255, 255, 0.7); /* Mica effect base */
  --win-face-solid: #ffffff;
  --win-shadow: #e5e5e5;
  --win-hilight: #ffffff;
  --win-dark-shadow: rgba(0, 0, 0, 0.1);
  --win-text: #202020;
  --win-blue: #005fb8; /* Windows 11 Blue */
  --win-blue-title: transparent;
  --win-blue-menubar: transparent;
  --win-border-radius: 8px;
  --win-btn-radius: 4px;
  --win-shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.12);
  --win-shadow-flyout: 0 8px 32px rgba(0, 0, 0, 0.15);
}`;

const rootNew = `:root {
  --font-sans: 'Tahoma', 'Segoe UI', sans-serif;
  --font-mono: 'Consolas', 'Courier New', monospace;
  
  /* SWD / Windows Classic Style */
  --win-bg: #ece9d8;
  --win-face: #ece9d8;
  --win-face-solid: #ece9d8;
  --win-shadow: #aca899;
  --win-hilight: #ffffff;
  --win-dark-shadow: #716f64;
  --win-text: #000000;
  --win-blue: #0a246a;
  --win-blue-title: #0a246a;
  --win-blue-menubar: #ece9d8;
  --win-border-radius: 0px;
  --win-btn-radius: 0px;
  --win-shadow-soft: none;
  --win-shadow-flyout: 2px 2px 4px rgba(0, 0, 0, 0.3);
}`;

code = code.replace(rootOld, rootNew);

// Adjust window components
code = code.replace("border-radius: var(--win-border-radius);", "border-radius: 0;");
code = code.replace("background-color: var(--win-face-solid);", "background-color: #ffffff;"); // mostly tables and content areas are white

fs.writeFileSync('src/index.css', code);
