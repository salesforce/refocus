/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/persistSampleStoreJob.js
 */
const expect = require('chai').expect;
const j = require('../../clock/scheduledJobs/persistSampleStoreJob');
const tu = require('../testUtils');
const featureToggles = require('feature-toggles');
const sampleStore = require('../../cache/sampleStore');
const initialFeatureState = featureToggles
  .isFeatureEnabled(sampleStore.constants.featureName);

describe('tests/clock/persistSampleStoreJob.js >', () => {
  describe('feature not enabled >', () => {
    before(() => tu.toggleOverride(sampleStore.constants.featureName, false));
    after(() => tu.toggleOverride(sampleStore.constants.featureName,
      initialFeatureState));
    it('ok, feature not enabled', (done) => {
      j.execute()
      .then((res) => expect(res).to.be.false)
      .then(() => done())
      .catch(done);
    });
  });

  describe('feature enabled >', () => {
    before(() => tu.toggleOverride(sampleStore.constants.featureName, true));
    after(() => tu.toggleOverride(sampleStore.constants.featureName,
      initialFeatureState));
    it('ok, feature enabled', (done) => {
      j.execute()
      .then((res) => expect(res).to.not.be.false)
      .then(() => done())
      .catch(done);
    });
  });
});
