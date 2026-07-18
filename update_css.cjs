const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(/:root \{[\s\S]*?\}/, `:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'Cascadia Code', 'Consolas', monospace;
  
  --win-bg: #f1f5f9;
  --win-face: #ffffff;
  --win-face-solid: #ffffff;
  --win-shadow: #e2e8f0;
  --win-hilight: #ffffff;
  --win-dark-shadow: rgba(0, 0, 0, 0.05);
  --win-text: #1e293b;
  --win-blue: #2563eb;
  --win-blue-title: transparent;
  --win-blue-menubar: transparent;
  --win-border-radius: 8px;
  --win-btn-radius: 6px;
  --win-shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --win-shadow-flyout: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}`);

css = css.replace(/\.border-outset, \.border-double-outset \{[\s\S]*?\}/, `.border-outset, .border-double-outset {
  background: var(--win-face);
  border: 1px solid var(--win-shadow);
  box-shadow: var(--win-shadow-soft);
  border-radius: var(--win-border-radius);
  color: var(--win-text);
}`);

css = css.replace(/\.border-inset, \.border-double-inset \{[\s\S]*?\}/, `.border-inset, .border-double-inset {
  background-color: var(--win-face-solid);
  border: 1px solid var(--win-shadow);
  border-radius: var(--win-btn-radius);
  color: var(--win-text);
}`);

css = css.replace(/\.btn-win \{[\s\S]*?\}/, `.btn-win {
  background: var(--win-blue);
  color: #ffffff;
  border: none;
  padding: 6px 12px;
  border-radius: var(--win-btn-radius);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}`);

css = css.replace(/\.btn-win:hover \{[\s\S]*?\}/, `.btn-win:hover {
  background: #1d4ed8;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}`);

css = css.replace(/\.btn-win:active \{[\s\S]*?\}/, `.btn-win:active {
  background: #1e40af;
  transform: translateY(1px);
}`);

css = css.replace(/\.btn-win:disabled \{[\s\S]*?\}/, `.btn-win:disabled {
  background: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}`);

css = css.replace(/\.input-field \{[\s\S]*?\}/, `.input-field {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 4px 8px;
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--win-text);
  outline: none;
  transition: border-color 0.2s;
}`);

css = css.replace(/\.input-field:focus \{[\s\S]*?\}/, `.input-field:focus {
  border-color: var(--win-blue);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}`);

css = css.replace(/body \{[\s\S]*?\}/, `body {
  font-family: var(--font-sans);
  background: var(--win-bg);
  color: var(--win-text);
  height: 100vh;
  overflow: hidden;
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  user-select: none;
}`);

// Fix table header backgrounds
css = css.replace(/\.swd-table th \{[\s\S]*?\}/, `.swd-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  text-align: left;
  padding: 8px 12px;
  border-bottom: 2px solid #e2e8f0;
}`);

fs.writeFileSync('src/index.css', css);
