/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/pubStatsLogs.js
 */
const expect = require('chai').expect;
const p = require('../../clock/scheduledJobs/pubStatsLogs');
const rcache = require('../../cache/redisCache').client.cache;
const PUB_STATS_HASH = require('../../realtime/constants').pubStatsHash;

describe('tests/clock/pubStatsLogs >', () => {
  describe('toLogObj >', () => {
    it('ok', () => {
      expect(p.toLogObj('x.y.z', 1)).to.deep.equal({
        activity: 'pubStats',
        key: 'x.y.z',
        count: 1,
      });
    });

    it('null key', () => {
      expect(p.toLogObj(null, 100)).to.deep.equal({
        activity: 'pubStats',
        key: 'None',
        count: 100,
      });
    });

    it('non-string key', () => {
      expect(p.toLogObj(3.1415927, 100)).to.deep.equal({
        activity: 'pubStats',
        key: 'None',
        count: 100,
      });
    });

    it('zero-length key', () => {
      expect(p.toLogObj('', 100)).to.deep.equal({
        activity: 'pubStats',
        key: 'None',
        count: 100,
      });
    });

    it('null count', () => {
      expect(p.toLogObj('ab.cd.ef', null)).to.deep.equal({
        activity: 'pubStats',
        key: 'ab.cd.ef',
        count: 0,
      });
    });

    it('non-numeric count', () => {
      expect(p.toLogObj('ab.cd.ef', 'yellow')).to.deep.equal({
        activity: 'pubStats',
        key: 'ab.cd.ef',
        count: 0,
      });
    });

    it('negative count', () => {
      expect(p.toLogObj('ab.cd.ef', -47)).to.deep.equal({
        activity: 'pubStats',
        key: 'ab.cd.ef',
        count: 0,
      });
    });
  });

  describe('generateLogObjects >', () => {
    beforeEach(() => {
      rcache.hincrby(PUB_STATS_HASH, 'a.a.a', 1);
      rcache.hincrby(PUB_STATS_HASH, 'b.b.b', 10);
      rcache.hincrby(PUB_STATS_HASH, 'c.c.c', 100);
    });

    afterEach(() => rcache.del(PUB_STATS_HASH));

    it('ok', (done) => {
      p.generateLogObjects()
      .then((arr) => {
        expect(arr).to.deep.equal([
          { activity: 'pubStats', key: 'a.a.a', count: 1 },
          { activity: 'pubStats', key: 'b.b.b', count: 10 },
          { activity: 'pubStats', key: 'c.c.c', count: 100 },
        ]);
        return rcache.existsAsync(PUB_STATS_HASH);
      })
      .then((exists) => expect(exists).to.deep.equal(0))
      .then(() => done())
      .catch(done);
    });
  });
});
