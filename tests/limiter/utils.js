/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/limiter/utils.js
 */
'use strict';
const tu = require('../testUtils');
const testStartTime = new Date();

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.Aspect, testStartTime)
    .then(() => done())
    .catch(done);
  },
};
