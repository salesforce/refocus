/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/jobs/checkMissedCollectorHeartbeat.js
 */
const expect = require('chai').expect;
const j = require('../../../clock/scheduledJobs/checkMissedCollectorHeartbeat');

describe('tests/clock/jobs/checkMissedCollectorHeartbeat.js >', () => {
  it('ok', (done) => {
    j.execute()
    .then((resp) => {
      expect(resp).to.not.be.false;
      done();
    })
    .catch(done);
  });
});
