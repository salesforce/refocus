const app = require('./../../../../index.js').app;

app.on('app_started', (() => {
	const puppeteer = require('puppeteer');
	(async () => {
		const browser = await puppeteer.launch({ headless: false, sloMo: 80});
		const page = await browser.newPage();
		await page.goto('http://localhost:3000/rooms/new/testRoomNameD?roomType=testRoomTypeB');
		// const path = await page.evaluate(() => {
		// 	return window.location;
		// });

		await page.waitForSelector("input[name=username]");
		await page.click("input[name=username]")
		await page.waitFor(500);
		await page.type("input[name=username]", 'admin@refocus.admin');
		await page.waitFor(500);
		await page.click("input[name=password]")
		await page.waitFor(500);
		await page.type("input[name=password]", 'password');
		await page.waitFor(500);
		await page.click('button[type=submit]');
		console.log(page.evaluate())

		await page.waitForSelector("div[id=botsContainer]");

		const path = await page.evaluate((a) => {
			console.log(a);
		});
	})();
}));
