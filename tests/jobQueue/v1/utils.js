/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/utils.js
 */
'use strict';

const tu = require('../../testUtils');
const testStartTime = new Date();
const samstoinit = require('../../../cache/sampleStoreInit');

module.exports = {
  forceDelete(done) {
    samstoinit.eradicate()
    .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },

  populateRedis(done) {
    samstoinit.populate()
    .then(() => done())
    .catch(done);
  },
};
