/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/queueStatsActivityLogs.js
 */

const expect = require('chai').expect;
const qs = require('../../clock/scheduledJobs/queueStatsActivityLogs');
const redis = require('../../cache/redisCache');
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const client = redis.client.realtimeLogging;

describe('tests/clock/queueStatsActivityLogs.js >', () => {
  it('arrayToString', () => {
    const resp = qs.arrayToString([ZERO, ONE, TWO]);
    expect(resp).to.be.an('string');
    expect(resp).to.equal('0,1,2');
  });

  it('stringToArray', () => {
    const resp = qs.stringToArray('0,1,2');
    expect(resp).to.be.an('array');
    expect(resp).to.deep.equal([ZERO, ONE, TWO]);
  });

  it('stringToArray null string', () => {
    const resp = qs.stringToArray('');
    expect(resp).to.be.an('array');
    expect(resp).to.deep.equal([]);
  });

  it('addToArray', () => {
    const resp = qs.addToArray('0,1', TWO);
    expect(resp).to.be.an('string');
    expect(resp).to.equal('0,1,2');
  });

  it('calculateStatsEvenNumber', () => {
    const qt = [];
    for (let i = 1; i <= 20; i++) {
      qt.push(i);
    }

    const resp = qs.calculateStats(qt);
    expect(resp).to.be.an('object');
    expect(resp.averageQueueTimeMillis).to.equal('10.50');
    expect(resp.medianQueueTimeMillis).to.equal('10.50');
    expect(resp.queueTime95thMillis).to.equal(19);
  });

  it('calculateStatsOddNumber', () => {
    const qt = [];
    for (let i = 1; i <= 21; i++) {
      qt.push(i);
    }

    const resp = qs.calculateStats(qt);
    expect(resp).to.be.an('object');
    expect(resp.averageQueueTimeMillis).to.equal('11.00');
    expect(resp.medianQueueTimeMillis).to.equal('11.00');
    expect(resp.queueTime95thMillis).to.equal(20);
  });

  it('checkUpdate of queueStats', (done) => {
    qs.update(20, TWO);
    const timestamp = qs.createTimeStamp();
    const key = 'queueStats.' + timestamp;

    setTimeout(() => {
      client.hgetallAsync(key).then((resp) => {
        if (resp) {
          try {
            expect(resp).to.be.an('object');
            expect(resp.jobCount).to.equal('1');
            expect(resp.recordCount).to.equal('20');
            expect(resp.queueTimeArray).to.equal('2');

            client.del(key);
            done();
          } catch (_err) {
            client.del(key);
            done(_err);
          }
        } else {
          done();
        }
      })
      .catch(done);
    }, 600);
  });

  it('constructLogObject', (done) => {
    qs.update(20, TWO);
    const timestamp = qs.createTimeStamp();
    const key = 'queueStats.' + timestamp;

    setTimeout(() => {
      client.hgetallAsync(key).then((logObject) => {
        if (logObject) {
          try {
            const resp = qs.constructLogObject(logObject);
            expect(resp).to.be.an('object');
            expect(resp.jobCount).to.equal('1');
            expect(resp.recordCount).to.equal('20');
            expect(resp.averageQueueTimeMillis).to.equal('2.00');
            expect(resp.medianQueueTimeMillis).to.equal('2.00');
            expect(resp.queueTime95thMillis).to.equal(2);
            expect(resp.timestamp).to.equal(timestamp);

            client.del(key);
            done();
          } catch (_err) {
            client.del(key);
            done(_err);
          }
        } else {
          done();
        }
      })
      .catch(done);
    }, 600);
  });
});
