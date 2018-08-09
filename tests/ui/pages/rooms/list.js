/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/ui/pages/rooms/list.js
 */
const expect = require('chai').expect;

const utils = require('../../utils/utils.js');
const testUtils = require('../../../testUtils.js');
const setup = require('../../setup.js');

const { baseUrl } = utils;

describe('tests/ui/pages/rooms/list.js >', function() {
  // These tests seem to take longer than mocha default 2000ms
  this.timeout(5000);
  let browser, page;

  before((done) => {
    setup.puppeteer()
    .then((b) => {
      browser = b;
      utils.loginInBrowser(browser)
      .then((p) => {
        page = p;
        done();
      });
    });
  });

  after(testUtils.forceDeleteUser);

  after(() => {
    browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(baseUrl + '/rooms');
  });


  it('ok, room renders', async function () {
    expect(page.url()).to.equal(`${baseUrl}/rooms`);
  });
});
