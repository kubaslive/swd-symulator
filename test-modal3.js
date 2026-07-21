import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.toString()));

  const { exec } = await import('child_process');
  const child = exec('npm run preview -- --port 4173', { cwd: process.cwd() });
  
  await new Promise(r => setTimeout(r, 4000));
  
  await page.goto('http://localhost:4173');
  await page.waitForTimeout(2000);
  
  // Login
  await page.fill('input[type="password"]', 'swd2024');
  await page.click('button:has-text("Zaloguj")');
  await page.waitForTimeout(4000); 
  
  // Click "Nowe Zdarzenie"
  await page.click('button:has-text("Nowe Zdarzenie")');
  await page.waitForTimeout(2000);
  
  console.log("ERRORS:", errors);
  await page.screenshot({ path: 'modal-new.png' });
  console.log("Screenshot saved.");
  
  await browser.close();
  child.kill();
  process.exit(0);
})();
