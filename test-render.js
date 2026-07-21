import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err));

  // Serve locally and wait for it
  const { exec } = await import('child_process');
  const child = exec('npm run preview -- --port 4173', { cwd: process.cwd() });
  
  await new Promise(r => setTimeout(r, 3000));
  
  await page.goto('http://localhost:4173');
  await page.waitForTimeout(5000);
  
  await browser.close();
  child.kill();
  process.exit(0);
})();
