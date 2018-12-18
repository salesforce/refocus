/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/jobs/pubsubStatsLogs.js
 */
const expect = require('chai').expect;
const p = require('../../../clock/scheduledJobs/pubsubStatsLogs');
const rcache = require('../../../cache/redisCache').client.cache;
const pubsubStatsKeys = require('../../../realtime/constants').pubsubStatsKeys;
const ZERO = 0;

describe('tests/clock/jobs/pubsubStatsLogs >', () => {
  describe('generateLogObjects >', () => {
    beforeEach(() => {
      rcache.sadd(`${pubsubStatsKeys.sub.processes}`, '1');
      rcache.sadd(`${pubsubStatsKeys.sub.processes}`, '2');
      rcache.hincrby(pubsubStatsKeys.pub.count, 'a.a.a', 1);
      rcache.hincrby(pubsubStatsKeys.pub.time, 'a.a.a', 10);
      rcache.hincrby(`${pubsubStatsKeys.sub.count}:1`, 'a.a.a', 100);
      rcache.hincrby(`${pubsubStatsKeys.sub.time}:1`, 'a.a.a', 1000);
      rcache.hincrby(`${pubsubStatsKeys.sub.count}:2`, 'a.a.a', 100);
      rcache.hincrby(`${pubsubStatsKeys.sub.time}:2`, 'a.a.a', 1000);
      rcache.hincrby(pubsubStatsKeys.pub.count, 'b.b.b', 2);
      rcache.hincrby(pubsubStatsKeys.pub.time, 'b.b.b', 20);
      rcache.hincrby(`${pubsubStatsKeys.sub.count}:1`, 'b.b.b', 200);
      rcache.hincrby(`${pubsubStatsKeys.sub.time}:1`, 'b.b.b', 2000);
      rcache.hincrby(`${pubsubStatsKeys.sub.count}:2`, 'b.b.b', 200);
      rcache.hincrby(`${pubsubStatsKeys.sub.time}:2`, 'b.b.b', 2000);
    });

    it('ok', (done) => {
      p.generateLogObjects()
      .then((arr) => {
        expect(arr).to.deep.equal([
          {
            activity: 'pubsub',
            key: 'a.a.a',
            process: '1',
            pubCount: '1',
            pubTime: '10',
            subCount: '100',
            subTime: '1000',
          },
          {
            activity: 'pubsub',
            key: 'b.b.b',
            process: '1',
            pubCount: '2',
            pubTime: '20',
            subCount: '200',
            subTime: '2000',
          },
          {
            activity: 'pubsub',
            key: 'a.a.a',
            process: '2',
            pubCount: '1',
            pubTime: '10',
            subCount: '100',
            subTime: '1000',
          },
          {
            activity: 'pubsub',
            key: 'b.b.b',
            process: '2',
            pubCount: '2',
            pubTime: '20',
            subCount: '200',
            subTime: '2000',
          },
        ]);
        return rcache.existsAsync(pubsubStatsKeys.sub.processes);
      })
      .then((exists) => expect(exists).to.deep.equal(ZERO))
      .then(() => rcache.existsAsync(pubsubStatsKeys.pub.count))
      .then((exists) => expect(exists).to.deep.equal(ZERO))
      .then(() => rcache.existsAsync(pubsubStatsKeys.sub.count + ':2'))
      .then((exists) => expect(exists).to.deep.equal(ZERO))
      .then(() => done())
      .catch(done);
    });
  });

  describe('generateLogObjects (no data) >', () => {
    it('ok', (done) => {
      p.generateLogObjects()
      .then((arr) => expect(arr).to.be.empty)
      .then(() => done())
      .catch(done);
    });
  });
});
