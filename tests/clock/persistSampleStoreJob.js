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

describe('persistSampleStoreJob', () => {
  it('ok', (done) => {
    j.execute()
    .then((res) => expect(res).to.be.true)
    .then(() => done())
    .catch(done);
  });
});
