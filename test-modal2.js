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
  await page.waitForTimeout(4000); // Wait for incidents to load
  
  // Double click the first incident in the table to open "Karta Zdarzenia"
  // Rejestr wyjazdów table rows
  const rows = await page.$$('table tr');
  if (rows.length > 1) {
      await rows[1].dblclick(); // Double click first actual incident row
      await page.waitForTimeout(2000);
      
      console.log("ERRORS:", errors);
  } else {
      console.log("No incidents found in table");
  }
  
  await browser.close();
  child.kill();
  process.exit(0);
})();
