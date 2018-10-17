/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/clock.js
 */
const expect = require('chai').expect;
const ms = require('ms');
const u = require('./utils/utils');
const redisClient = require('../../cache/redisCache').client.clock;

describe('tests/clock/clock.js >', function () {
  this.timeout(5000);

  beforeEach(() => redisClient.flushallAsync());
  after(() => redisClient.flushallAsync());
  afterEach(u.stopClockProcess);

  it('default config', () => {
    const expectedCount = {
      checkMissedCollectorHeartbeat: intervalsInDay('15s'),
      deactivateRooms: intervalsInDay('5m'),
      jobCleanup: intervalsInDay('30m'),
      resetJobCounter: intervalsInDay('24h'),
      sampleTimeout: intervalsInDay('30s'),
    };

    return u.runClock('24h')
    .then((callCounts) => {
      Object.keys(expectedCount).forEach((jobName) => {
        expect(callCounts[jobName]).to.equal(expectedCount[jobName]);
      });
    });
  });

  it('worker enabled', () => {
    const env = {
      ENABLE_WORKER_PROCESS: 'true',
    };

    const expectedCount = {
      checkMissedCollectorHeartbeat: intervalsInHour('15s'),
      deactivateRooms: intervalsInHour('5m'),
      jobCleanup: intervalsInHour('30m'),
      resetJobCounter: intervalsInHour('24h'),
      sampleTimeout: intervalsInHour('30s'),
    };

    return u.runClock('1h', env)
    .then((callCounts) => {
      Object.keys(expectedCount).forEach((jobName) => {
        expect(callCounts[jobName]).to.equal(expectedCount[jobName]);
      });
    });
  });

  it('toggles on', () => {
    const env = {
      ENABLE_ACTIVITY_LOGS: 'kueStats,pubStats,queueStats',
      ENABLE_REDIS_SAMPLE_STORE: 'true',
    };

    const expectedCount = {
      checkMissedCollectorHeartbeat: intervalsInHour('15s'),
      deactivateRooms: intervalsInHour('5m'),
      jobCleanup: intervalsInHour('30m'),
      kueStatsActivityLogs: intervalsInHour('1m'),
      pubStatsLogs: intervalsInHour('1m'),
      queueStatsActivityLogs: intervalsInHour('1m'),
      resetJobCounter: intervalsInHour('24h'),
      sampleTimeout: intervalsInHour('30s'),
    };

    return u.runClock('1h', env)
    .then((callCounts) => {
      Object.keys(expectedCount).forEach((jobName) => {
        expect(callCounts[jobName]).to.equal(expectedCount[jobName]);
      });
    });
  });

  it('override intervals', () => {
    const env = {
      'CLOCK_JOB_INTERVAL:checkMissedCollectorHeartbeat': '1m',
      'CLOCK_JOB_INTERVAL:deactivateRooms': '2m',
      'CLOCK_JOB_INTERVAL:jobCleanup': '3m',
      'CLOCK_JOB_INTERVAL:resetJobCounter': '4m',
      'CLOCK_JOB_INTERVAL:sampleTimeout': '5m',
    };

    const expectedCount = {
      checkMissedCollectorHeartbeat: intervalsInHour('1m'),
      deactivateRooms: intervalsInHour('2m'),
      jobCleanup: intervalsInHour('3m'),
      resetJobCounter: intervalsInHour('4m'),
      sampleTimeout: intervalsInHour('5m'),
    };

    return u.runClock('1h', env)
    .then((callCounts) => {
      Object.keys(expectedCount).forEach((jobName) => {
        expect(callCounts[jobName]).to.equal(expectedCount[jobName]);
      });
    });
  });

  function intervalsInDay(interval) {
    return Math.floor(ms('24h') / ms(interval));
  }

  function intervalsInHour(interval) {
    return Math.floor(ms('1h') / ms(interval));
  }
});
