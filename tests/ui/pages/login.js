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
const pom = require('../utils/pageObjectModels/login.js');
const { baseUrl } = require('./../utils/utils.js');

describe('tests/ui/pages/login.js >', function() {
  // These tests seem to take longer than mocha default 2000ms
  this.timeout(5000);
  let browser, page, name;

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

  it('ok, logging in with test user', async function () {
    await page.waitFor(pom.title);
    await page.click(pom.usernameInput);
    await page.type(pom.usernameInput, name);
    await page.click(pom.passwordInput);
    await page.type(pom.passwordInput, userName);
    await page.click(pom.loginButton);
    await page.waitForNavigation();
    expect(page.url()).to.equal(`${baseUrl}/perspectives`);
  });

  it('fail, invalid login details', async function () {
    await page.waitFor(pom.title);
    await page.click(pom.usernameInput);
    await page.type(pom.usernameInput, 'potatoes');
    await page.click(pom.passwordInput);
    await page.type(pom.passwordInput, 'potatoes');
    await page.click(pom.loginButton);
    // Waiting for DOM to change error message
    await page.waitFor(() =>
      document.querySelector('#errorInfo').innerText.length);
    expect(await page.$eval(pom.loginErrorLabel,
      label => label.innerText)).to.eql('An unexpected error occurred');
  });
});
