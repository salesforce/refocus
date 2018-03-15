/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/utils.js
 */
'use strict';
const tu = require('../../../testUtils');

const testStartTime = new Date();
const samstoinit = require('../../../../cache/sampleStoreInit');
const featureToggles = require('feature-toggles');
const rcli = require('../../../../cache/redisCache').client.sampleStore;
const Promise = require('bluebird');

function flushRedisIfEnabled() {
  if (
    featureToggles.isFeatureEnabled('enableRedisSampleStore')
    && featureToggles.isFeatureEnabled('getSubjectFromCache')
  ) {
    return rcli.flushallAsync();
  } else {
    return Promise.resolve();
  }
}

module.exports = {
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

