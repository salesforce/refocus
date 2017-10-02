/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/e2e/register.js
 */
const server = require('../../index').httpServer;

// TODO: get this from config
const baseUrl = 'http://localhost:3000/register';
module.exports = {
  before : function() {
    app = server.listen(3000);
  },
  // after each: delete the
  after : function() {
    // for httpserver. express server does not have a .close()
    app.close();
  },

  // if the test failed, cause include user already exists
  'Default perspective loads after register':  (browser) => {
    browser
      .url(baseUrl)
      .register("email", "email")
      .pause(3000)
      .assert.elementPresent('.slds-lookup__search-input')
      .end();
  }
};
