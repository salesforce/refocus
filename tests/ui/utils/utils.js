/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/ui/utils/utils.js
 */
const userName = 'UI-Test-User';
const testUtils = require('../../testUtils.js');
const loginPom = require('./pageObjectModels/login.js');

const { port } = require('./../../../config.js');
const baseUrl = `http://localhost:${port}`;

module.exports = {

  baseUrl,

  /**
   * Creates a new user and then logs into that user with a given browser
   * and redirects to a given url.
   *
   * @param {Browser} browser
   * @param {String} url
   * @returns {Promise} Resolves to a page.
   */
  loginInBrowser(browser) {
    let name;
    return testUtils.createUser(userName)
    .then((user) => {
      name = user.dataValues.name;
      return browser.newPage();
    }).then((page) => {
      return page.goto(`${baseUrl}/login`)
      .then(() => page.waitForSelector(loginPom.title))
      .then(() => page.click(loginPom.usernameInput))
      .then(() => page.type(loginPom.usernameInput, name))
      .then(() => page.click(loginPom.passwordInput))
      .then(() => page.type(loginPom.passwordInput, userName))
      .then(() => page.click(loginPom.loginButton))
      .then(() => {
        return page.waitForNavigation();
      });
    });
  },
};
