/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/bot/utils.js
 */
'use strict';

const tu = require('../../../testUtils');

const testStartTime = new Date();
const n = `${tu.namePrefix}TestBot`;
const n2 = n+'NonActive';

const standard = {
  name: n,
  location: 'http://www.bar.com',
  active: true,
};

const nonActive = {
  name: n2,
  location: 'http://www.bar.com',
  active: false,
};

module.exports = {
  name: n,

  nameNonActive: n2,

  getStandard() {
    return JSON.parse(JSON.stringify(standard));
  },

  createNonActive() {
    return tu.db.Bot.create(nonActive);
  },

  createStandard() {
    return tu.db.Bot.create(standard);
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.Bot, testStartTime)
    .then(() => done())
    .catch(done);
  },
};
