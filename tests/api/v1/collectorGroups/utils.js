/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectorGroups/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const testStartTime = new Date();

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.Collector, testStartTime)
      .then(() => tu.forceDelete(tu.db.CollectorGroup, testStartTime))
      .then(() => done())
      .catch(done);
  },
};
