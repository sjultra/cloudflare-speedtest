import path from 'path';
import puppeteer, {Browser} from 'puppeteer';
import { InfluxDB } from 'influx'

process.env.INFLUXDB_HOST = (process.env.INFLUXDB_HOST) ? process.env.INFLUXDB_HOST : 'influxdb';
process.env.INFLUXDB_DB = (process.env.INFLUXDB_DB) ? process.env.INFLUXDB_DB : 'speedtest';
process.env.INFLUXDB_USERNAME = (process.env.INFLUXDB_USERNAME) ? process.env.INFLUXDB_USERNAME : 'admin';
process.env.INFLUXDB_PASSWORD = (process.env.INFLUXDB_PASSWORD) ? process.env.INFLUXDB_PASSWORD : 'password';
process.env.SPEEDTEST_HOST = (process.env.SPEEDTEST_HOST) ? process.env.SPEEDTEST_HOST : 'local';
process.env.SPEEDTEST_INTERVAL = (process.env.SPEEDTEST_INTERVAL) ? process.env.SPEEDTEST_INTERVAL : '3600';

const SPEEDTEST_INTERVAL:number = Number(process.env.SPEEDTEST_INTERVAL) * 1000;

const bitToMbps = (bit:number) => (bit / 1000 / 1000) * 8;

type SpeedMetrics = {
    download: number,
    upload: number,
    latency: number,
    jitter: number,
    downLoadedLatency: number,
    downLoadedJitter: number,
    upLoadedLatency: number,
    upLoadedJitter: number,
    packetLoss: number
};

/**
 * Utilizes puppeteer to open a new page in a headless browser
 * and request timing data from @cloudflare-speedtest
 * @param {Browser} browser - The browser instance
 * @returns {SpeedMetrics} - SpeedMetrics w/ converted Down/Upload
 */
const getSpeedMetrics = async (browser:Browser): Promise<SpeedMetrics | null>  => {
    // Construct a filepath for speedtest.html to run in the browser
    const filePath = path.resolve(__dirname, 'speedtest.html');
    const fileUrl = 'file://' + filePath;

    const page = await browser.newPage();
    await page.goto(fileUrl);

    console.log('Starting new SpeedTest...\n');

    // Wait for results from the browser
    await page.waitForFunction(() => {
        return window.SpeedTestResults !== null || window.SpeedTestError !== null;
    }, { timeout: 2 * 60_000 }); // 2 minute timeout

    const { results, error } = await page.evaluate(() => ({
        results: window.SpeedTestResults as SpeedMetrics | null,
        error: window.SpeedTestError as unknown | null
    }));

    if (results === null) {
        console.error('SpeedTest encountered an error:', error, '\n');
        await page.close();
        return null;
    }

    await page.close();
    const convertedResults:SpeedMetrics = convertBitsToMbps(results);
    return convertedResults;

};

function convertBitsToMbps(metrics: SpeedMetrics): SpeedMetrics {
    return {
        ...metrics,
        download: bitToMbps(metrics.download),
        upload: bitToMbps(metrics.upload),
    };
}

const pushToInflux = async (influx:any, metrics:SpeedMetrics) => {
    const points = Object.entries(metrics).map(([measurement, value]) => ({
        measurement,
        tags: { host: process.env.SPEEDTEST_HOST },
        fields: { value }
    }));

    await influx.writePoints(points);
};

(async () => {
    try {
        const browser:Browser = await puppeteer.launch({ 
            // headless: true, 
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            executablePath: '/usr/bin/chromium'
        });

        const influx:InfluxDB = new InfluxDB({
            host: process.env.INFLUXDB_HOST,
            database: process.env.INFLUXDB_DB,
            username: process.env.INFLUXDB_USERNAME,
            password: process.env.INFLUXDB_PASSWORD,
        });

        while (true) {
            const results = await getSpeedMetrics(browser);

            if (results) {
                console.log('SpeedTest results:', results, '\n');
                await pushToInflux(influx, results);
            } else {
                console.log('No metrics collected this round.\n');
            }

            console.log(`Waiting ${SPEEDTEST_INTERVAL / 1000} seconds before next test...`);
            await new Promise((resolve) => setTimeout(resolve, SPEEDTEST_INTERVAL));
        }
    } catch (error: any) {
        console.error(error.message);
        process.exit(1);
    }
})();
