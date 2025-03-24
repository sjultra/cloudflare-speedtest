import path from 'path';
import puppeteer from 'puppeteer';

(async () => {
    const INTERVAL = 30_000;

    const browser = await puppeteer.launch({ headless: true });

    // Construct a filepath to speedtest.html to run in the browser
    const filePath = path.resolve(__dirname, 'speedtest.html');
    const fileUrl = 'file://' + filePath;

    while (true) {
        const page = await browser.newPage();
        await page.goto(fileUrl);

        console.log('Starting new SpeedTest.\n');

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
            console.log('SpeedTest results:', results, '\n');
        } else {
            console.error('SpeedTest encountered an error:', error, '\n');
        }

        await page.close();
        await new Promise((resolve) => setTimeout(resolve, INTERVAL));
    }
})();

