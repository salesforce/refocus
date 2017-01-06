/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/sampleTimeoutJobs.js
 */
const expect = require('chai').expect;
const j = require('../../clock/scheduledJobs/sampleTimeoutJob');

describe('sampleTimeoutJob', () => {
  it('ok', (done) => {
    j.execute()
    .then((resp) => {
      expect(resp).to.match(/Evaluated \d+ samples; \d+ were timed out\./);
      done();
    })
    .catch(done);
  });
});
