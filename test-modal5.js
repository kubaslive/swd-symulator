import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const { exec } = await import('child_process');
  const child = exec('npm run preview -- --port 4173', { cwd: process.cwd() });
  
  await new Promise(r => setTimeout(r, 4000));
  
  await page.goto('http://localhost:4173');
  await page.waitForTimeout(2000);
  
  // Login
  await page.fill('input[type="password"]', 'swd2024');
  await page.click('button:has-text("Zaloguj")');
  await page.waitForTimeout(4000); 
  
  // Try to find the button Nowe Zdarzenie
  const buttons = await page.$$('button');
  for (let b of buttons) {
    const text = await b.textContent();
    if (text && text.includes('Nowe Zdarzenie')) {
      await b.click();
      break;
    }
  }
  
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/Users/grucha/.gemini/antigravity/brain/957bf7d1-353d-4884-9eec-e40fe1bb12ec/scratch/modal-new.png' });
  console.log("Screenshot saved.");
  
  await browser.close();
  child.kill();
  process.exit(0);
})();
