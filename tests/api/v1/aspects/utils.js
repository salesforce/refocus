/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const samstoinit = require('../../../../cache/sampleStoreInit');
const featureToggles = require('feature-toggles');
const rcli = require('../../../../cache/redisCache').client.sampleStore;
const Promise = require('bluebird');

const testStartTime = new Date();

const subjectToCreate = {
  description: 'this is sample description',
  help: {
    email: 'sample@bar.com',
    url: 'http://www.bar.com/a0',
  },
  imageUrl: 'http://www.bar.com/a0.jpg',
  isPublished: true,
  name: `${tu.namePrefix}TEST_SUBJECT`,
};

function flushRedisIfEnabled() {
  if (featureToggles.isFeatureEnabled('enableRedisSampleStore')) {
    return rcli.flushallAsync();
  } else {
    return Promise.resolve();
  }
}

module.exports = {
  toCreate: {
    name: `${tu.namePrefix}ASPECTNAME`,
    isPublished: true,
    timeout: '110s',
    status0range: [0, 0],
    status1range: [1, 2],
    valueType: 'NUMERIC',
  },

  subjectToCreate,

  forceDelete(done) {
    Promise.join(
      flushRedisIfEnabled(),
      tu.forceDelete(tu.db.Sample, testStartTime)
      .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
      .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    )
    .then(() => done())
    .catch(done);
  },

  populateRedisIfEnabled(done) {
    if (
      featureToggles.isFeatureEnabled('enableRedisSampleStore')
    ) {
      samstoinit.eradicate()
      .then(() => samstoinit.populate())
      .then(() => done())
      .catch(done);
    } else {
      done();
    }
  },
};
