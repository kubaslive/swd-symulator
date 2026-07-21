import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const { exec } = await import('child_process');
  const child = exec('npm run preview -- --port 4173', { cwd: process.cwd() });
  
  await new Promise(r => setTimeout(r, 4000));
  
  await page.goto('http://localhost:4173');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'login-screen.png' });
  console.log("Screenshot saved.");
  
  await browser.close();
  child.kill();
  process.exit(0);
})();
