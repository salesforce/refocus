/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/ui/setup.js
 */
const puppeteer = require('puppeteer');

const app = require('./../../index.js').app;

/*
 * If you would like to see the UI tests happening in the broweser,
 * add the following fields: headless: false, slowMo: 10
 */
const opts = {
  // 'args' option is needed for this to work in travis
  headless: false, slowMo: 10,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
};

module.exports = {
  puppeteer() {
    // Promise which returns a browser object
    return puppeteer.launch(opts);
  },
};
