/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/logging/utils.js
 */

const tu = require('../testUtils');
const testStartTime = new Date();
const rcli = require('../../cache/redisCache').client.sampleStore;
const Promise = require('bluebird');

module.exports = {
  forceDelete(done) {
    Promise.join(
      rcli.flushallAsync(),
      tu.forceDelete(tu.db.Aspect, testStartTime)
      .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    )
    .then(() => done())
    .catch(done);
  },
};
