const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(/\.win-title-bar \{[\s\S]*?\}/, `.win-title-bar {
  background: #1e293b;
  color: #ffffff;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  user-select: none;
  height: 48px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}`);

css = css.replace(/\.win-title-bar \.title-text \{[\s\S]*?\}/, `.win-title-bar .title-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  letter-spacing: 0.3px;
}`);

css = css.replace(/\.win-ctrl-btn \{[\s\S]*?\}/, `.win-ctrl-btn {
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;
  transition: background 0.2s;
}`);

css = css.replace(/\.win-ctrl-btn:hover \{[\s\S]*?\}/, `.win-ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}`);

css = css.replace(/\.menu-bar \{[\s\S]*?\}/, `.menu-bar {
  background-color: #ffffff;
  border-bottom: 1px solid var(--win-shadow);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  user-select: none;
  height: 40px;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}`);

css = css.replace(/\.menu-item \{[\s\S]*?\}/, `.menu-item {
  padding: 0 12px;
  height: 100%;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}`);

css = css.replace(/\.menu-item:hover \{[\s\S]*?\}/, `.menu-item:hover {
  color: #1e293b;
  background-color: #f8fafc;
}`);

css = css.replace(/\.menu-item\.active \{[\s\S]*?\}/, `.menu-item.active {
  color: #2563eb;
  border-bottom: 2px solid #2563eb;
  font-weight: 600;
  background-color: transparent;
}`);

fs.writeFileSync('src/index.css', css);
