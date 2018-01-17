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

function flushRedisIfEnabled() {
  if (
    featureToggles.isFeatureEnabled('enableRedisSampleStore')
    && featureToggles.isFeatureEnabled('getSubjectFromCache')
  ) {
    return rcli.flushallAsync();
  }
}

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.Sample, testStartTime)
    .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => flushRedisIfEnabled())
    .then(() => done())
    .catch(done);
  },

  populateRedisIfEnabled(done) {
    if (
      featureToggles.isFeatureEnabled('enableRedisSampleStore')
    ) {
      samstoinit.populate()
      .then(() => done())
      .catch(done);
    } else {
      done();
    }
  },

};

