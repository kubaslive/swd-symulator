import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err));

  const { exec } = await import('child_process');
  const child = exec('npm run preview -- --port 4173', { cwd: process.cwd() });
  
  await new Promise(r => setTimeout(r, 3000));
  
  await page.goto('http://localhost:4173');
  await page.waitForTimeout(1000);
  
  // Login
  await page.fill('input[type="password"]', 'swd2024');
  await page.click('button:has-text("Zaloguj")');
  await page.waitForTimeout(2000);
  
  // Open modal
  // Click "Karta Zdarzenia"
  await page.click('button:has-text("Karta Zdarzenia")');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'modal-test.png' });
  console.log("Screenshot saved.");
  
  await browser.close();
  child.kill();
  process.exit(0);
})();
