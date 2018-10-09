/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/jobs/persistSampleStore.js
 */
const expect = require('chai').expect;
const j = require('../../../clock/scheduledJobs/persistSampleStore');
const tu = require('../../testUtils');
const featureToggles = require('feature-toggles');
const sampleStore = require('../../../cache/sampleStore');
const initialFeatureState = featureToggles
  .isFeatureEnabled(sampleStore.constants.featureName);

describe('tests/clock/jobs/persistSampleStore.js >', () => {
  describe('feature not enabled >', () => {
    before(() => tu.toggleOverride(sampleStore.constants.featureName, false));
    after(() => tu.toggleOverride(sampleStore.constants.featureName,
      initialFeatureState));
    it('ok, feature not enabled', (done) => {
      j.execute()
      .then((res) => expect(res).to.deep.equal({ recordCount: 0 }))
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
      .then((res) => expect(res).to.deep.equal({ recordCount: 0 }))
      .then(() => done())
      .catch(done);
    });
  });
});
