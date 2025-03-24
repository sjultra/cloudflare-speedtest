import path from 'path';
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // page.on('console', (msg) => console.log('[BROWSER LOG]', msg.text()));
  // page.on('pageerror', (err) => console.error('[BROWSER ERROR]', err));

  // Construct a filepath to speedtest.html to run in the browser
  const filePath = path.resolve(__dirname, 'speedtest.html');
  const fileUrl = 'file://' + filePath;

  await page.goto(fileUrl);

  // Wait for results from the browser
  await page.waitForFunction(() => {
    return window.SpeedTestResults !== null || window.SpeedTestError !== null;
  }, { timeout: 2 * 60_000 }); // 2 minute timeout

  const { results, error } = await page.evaluate(() => {
    return {
      results: window.SpeedTestResults,
      error: window.SpeedTestError
    };
  });

  if (results !== null) {
    console.log('SpeedTest results:', results);
  } else {
    console.error('SpeedTest encountered an error:', error);
  }

  await browser.close();
})();

