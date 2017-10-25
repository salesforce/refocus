/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const testStartTime = new Date();

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.Collector, testStartTime)
    .then(() => tu.forceDelete(tu.db.GeneratorTemplate, testStartTime))
    .then(() => tu.forceDelete(tu.db.Generator, testStartTime))
    .then(() => done())
    .catch(done);
  },

  toCreate: {
    name: tu.namePrefix + 'Coll',
    description: 'This is my collector description.',
    helpEmail: 'a@bcd.com',
    helpUrl: 'a.bcd.com',
    host: 'a.bcd',
    ipAddress: '127.0.0.1',
    version: '1.0.0',
  },
};
