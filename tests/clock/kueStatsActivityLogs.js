/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/kueStatsActivityLogs.js
 */
const expect = require('chai').expect;
const k = require('../../clock/scheduledJobs/kueStatsActivityLogs');
const redis = require('../../cache/redisCache');
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const client = redis.client.realtimeLogging;

describe('tests/clock/kueStatsActivityLogs.js >', () => {
  it('generateLogObject', () => {
    k.generateLogObject()
    .then((obj) => {
      expect(obj).to.be.an('object');
      expect(obj).to.have.property('activity', 'kueStats');
      expect(obj).to.have.property('activeCount');
      expect(obj).to.have.property('completeCount');
      expect(obj).to.have.property('failedCount');
      expect(obj).to.have.property('inactiveCount');
      expect(obj).to.have.property('workTimeMillis');
    });
  });
});
