const expect = require('chai').expect;
const puppeteer = require('puppeteer');
const sinon = require('sinon');

const app = require('./../../index.js').app;
let browser;

const opts = {
  headless: true,
  // slowMo: 10,
  // timeout: 10000
};

before ((done) => {
  puppeteer.launch(opts)
    .then((brws) => {
      browser = brws;
      done();
    });
});

after (() => {
  browser.close();
});

describe('sample test', function() {
  this.timeout(1000000);
  let page;

  beforeEach (async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000/login');
  });

  afterEach (async () => {
    await page.close();
  });

  it('ok, should have a heading', async function () {
    console.log(await browser.version());
    const HEADING_SELECTOR = 'h1';
    let heading;
    await page.waitFor(HEADING_SELECTOR);
    heading = await page.$eval(HEADING_SELECTOR, heading => heading.innerText);
    expect(heading).to.eql('Refocus');
  });

  it('ok, should be able to enter username', async () => {
    await page.waitForSelector("input[name=username]");
    await page.click("input[name=username]")
    await page.type("input[name=username]", 'admin@refocus.admin');
    await page.click("input[name=password]")
    await page.type("input[name=password]", 'password');
    await page.click('button[type=submit]');
    await page.waitForNavigation();
    expect(page.url()).to.equal('http://localhost:3000/perspectives');
  });

  // it('fail, incorrect password', async () => {
  //   await page.waitForSelector("input[name=username]");
  //   await page.click("input[name=username]")
  //   await page.type("input[name=username]", 'admin@refocus.admin');
  //   await page.click("input[name=password]")
  //   await page.type("input[name=password]", 'incorrect');
  //   await page.click('button[type=submit]');
  //   await page.waitForNavigation();
  //   expect(page.url()).to.equal('http://localhost:3000/login');
  // });
});
