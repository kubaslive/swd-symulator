const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(/\.classic-tabs \{[\s\S]*?\}/, `.classic-tabs {
  display: flex;
  background: transparent;
  padding: 0;
  border-bottom: 1px solid var(--win-shadow);
  gap: 8px;
}`);

css = css.replace(/\.classic-tab \{[\s\S]*?\}/, `.classic-tab {
  background: transparent;
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 2px solid transparent;
  font-weight: 500;
  transition: all 0.2s;
}`);

css = css.replace(/\.classic-tab\.active \{[\s\S]*?\}/, `.classic-tab.active {
  background: transparent;
  border-bottom: 2px solid var(--win-blue);
  color: var(--win-blue);
  font-weight: 600;
}`);

css = css.replace(/\.classic-tab:hover:not\(\.active\) \{[\s\S]*?\}/, `.classic-tab:hover:not(.active) {
  color: #334155;
  border-bottom: 2px solid #cbd5e1;
}`);

// If hover was not defined, add it:
if (!css.includes('.classic-tab:hover:not(.active)')) {
  css += `\n.classic-tab:hover:not(.active) {
  color: #334155;
  border-bottom: 2px solid #cbd5e1;
}\n`;
}

fs.writeFileSync('src/index.css', css);
