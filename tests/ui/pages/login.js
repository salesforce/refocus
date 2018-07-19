const expect = require('chai').expect;
const setup = require('../setup.js');
const { baseUrl } = setup;

let browser;

before ((done) => {
  setup.puppeteer().then((bwr) => {
    browser = bwr;
    done();
  })
});

after (() => {
  browser.close();
});

describe('sample test', function() {
  this.timeout(1000000);
  let page;

  beforeEach (async () => {
    page = await browser.newPage();
    await page.goto(baseUrl + '/login');
  });

  afterEach (async () => {
    await page.close();
  });

  it('ok, /login componants load and work', async function () {
    await page.waitFor('h1');
    expect(await page.$eval('h1', heading => heading.innerText)).to.eql('Refocus');
    await page.waitForSelector("input[name=username]");
    expect(await page.$eval('[name=username]', input => input.placeholder)).to.eql('Enter username');
    await page.click("input[name=username]");
    await page.type("input[name=username]", 'potatoes');
    expect(await page.$eval('[name=username]', input => input.value)).to.eql('potatoes');
  });

//   it('ok, /logging in', async function () {
//     await page.waitFor('h1');
//     expect(await page.$eval('h1', heading => heading.innerText)).to.eql('Refocus');
//     await page.waitForSelector("input[name=username]");
//     expect(await page.$eval('[name=username]', input => input.placeholder)).to.eql('Enter username');
//     await page.click("input[name=username]");
//     await page.type("input[name=username]", 'admin@refocus.admin');
//     await page.click("input[name=password]");
//     await page.type("input[name=password]", 'password');
//     await page.click("button[type=submit]");
//     await page.waitForNavigation();
// +    expect(page.url()).to.equal('http://localhost:3000/perspectives');
//   });

});
