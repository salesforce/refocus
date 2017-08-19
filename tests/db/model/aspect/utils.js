/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/aspect/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const testStartTime = new Date();
const n = `${tu.namePrefix}TestAspect`;
const small = {
  name: n,
  timeout: '1s',
  isPublished: true,
};
const medium = {
  name: n,
  description: 'This is an awesome aspect I\'m testing here',
  helpEmail: 'jolson@dailyplanet.com',
  helpUrl: 'http://www.dailyplanet.com',
  isPublished: true,
  criticalRange: [0, 1],
  warningRange: [1, 2],
  infoRange: [2, 3],
  okRange: [3, 4],
  timeout: '10m',
  valueLabel: 'ms',
  valueType: 'BOOLEAN',
};

module.exports = {
  name: n,

  getSmall() {
    return JSON.parse(JSON.stringify(small));
  },

  getMedium() {
    return JSON.parse(JSON.stringify(medium));
  },

  createMedium() {
    return tu.db.Aspect.create(medium);
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.Sample, testStartTime)
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => tu.forceDelete(tu.db.Tag, testStartTime))
    .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => done())
    .catch(done);
  },
};
