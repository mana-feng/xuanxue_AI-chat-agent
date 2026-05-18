const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  await page.goto('http://localhost:3050/', { waitUntil: 'networkidle', timeout: 30000 });
  
  await page.screenshot({ path: 'f:\\github\\xuanxue_AI-chat-agent\\frontend-only\\debug-screenshot.png', fullPage: true });
  
  const title = await page.title();
  console.log(`Page title: ${title}`);
  
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log(`Body text: ${bodyText.substring(0, 500)}`);
  
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log(`Body HTML length: ${html.length}`);
  console.log(`Body HTML (first 1000): ${html.substring(0, 1000)}`);

  await browser.close();
  console.log('Done. Screenshot saved.');
})();
