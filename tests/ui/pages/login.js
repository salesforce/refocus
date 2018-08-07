/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/ui/pages/login.js
 */
const expect = require('chai').expect;
const setup = require('../setup.js');
const testUtils = require('../../testUtils.js');
const userName = 'UI-Test-User';
const { baseUrl } = setup;

let browser;
let name;

describe('sample test', function() {
  this.timeout(5000);
  let page;

  before((done) => {
    testUtils.createUser(userName)
    .then((user) => {
      name = user.dataValues.name;
      return setup.puppeteer();
    })
    .then((b) => {
      browser = b;
      done();
    })
    .catch(done);
  });

  after(testUtils.forceDeleteUser);

  after(() => {
    browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(baseUrl + '/login');
  });

  afterEach(async () => {
    await page.close();
  });

  it('ok, /login componants load and work', async function () {
    await page.waitFor('h1');
    expect(await page.$eval('h1',
      heading => heading.innerText)).to.eql('Refocus');
    await page.waitForSelector('input[name=username]');
    expect(await page.$eval('[name=username]',
      input => input.placeholder)).to.eql('Enter username');
    await page.click('input[name=username]');
    await page.type('input[name=username]', 'potatoes');
    expect(await page.$eval('[name=username]', input => input.value)).to.eql('potatoes');
  });

  it('ok, /logging in with test user', async function () {
    await page.waitFor('h1');
    expect(await page.$eval('h1',
      heading => heading.innerText)).to.eql('Refocus');
    await page.waitForSelector('input[name=username]');
    expect(await page.$eval('[name=username]',
      input => input.placeholder)).to.eql('Enter username');
    await page.click('input[name=username]');
    await page.type('input[name=username]', name);
    await page.click('input[name=password]');
    await page.type('input[name=password]', userName);
    await page.click('button[type=submit]');
    await page.waitForNavigation();
    expect(page.url()).to.equal(`${baseUrl}/perspectives`);
  });
});
