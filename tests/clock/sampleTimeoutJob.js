/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/sampleTimeoutJob.js
 */
const expect = require('chai').expect;
const j = require('../../clock/scheduledJobs/sampleTimeoutJob');

describe('tests/clock/sampleTimeoutJob.js >', () => {
  it('ok', (done) => {
    j.execute()
    .then((resp) => {
      expect(resp).to.be.an('object');
      expect(resp).to.include.keys('numberEvaluated', 'numberTimedOut',
        'timedOutSamples');
      done();
    })
    .catch(done);
  });
});
