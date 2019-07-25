/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/jobs/sampleTimeout.js
 */
const expect = require('chai').expect;
const j = require('../../../clock/scheduledJobs/sampleTimeout');

describe('tests/clock/jobs/sampleTimeout.js >', () => {
  it('ok', (done) => {
    j.execute()
    .then((res) => {
      expect(res).to.be.an('object');
      expect(res).to.have.keys('recordCount', 'errorCount');
      done();
    })
    .catch(done);
  });
});
