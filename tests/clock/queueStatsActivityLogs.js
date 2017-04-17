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

describe('queueStatsActivityLogs', () => {
  it('arrayToString', (done) => {
    const resp = qs.arrayToString([ZERO, ONE, TWO]);
    expect(resp).to.be.an('string');
    expect(resp).to.equal('0,1,2');
    done();
  });

  it('stringToArray', (done) => {
    const resp = qs.stringToArray('0,1,2');
    expect(resp).to.be.an('array');
    expect(resp).to.deep.equal([ZERO, ONE, TWO]);
    done();
  });

  it('stringToArray null string', (done) => {
    const resp = qs.stringToArray('');
    expect(resp).to.be.an('array');
    expect(resp).to.deep.equal([]);
    done();
  });

  it('addToArray', (done) => {
    const resp = qs.addToArray('0,1', TWO);
    expect(resp).to.be.an('string');
    expect(resp).to.equal('0,1,2');
    done();
  });

  it('calculateStatsEvenNumber', (done) => {
    const qt = [];
    for (let i = 1; i <= 20; i++) {
      qt.push(i);
    }

    const resp = qs.calculateStats(qt);
    expect(resp).to.be.an('object');
    expect(resp.averageQueueTimeMillis).to.equal('10.50ms');
    expect(resp.medianQueueTimeMillis).to.equal('10.50ms');
    expect(resp.queueTimeMillis95th).to.equal('19ms');
    expect(resp.queueTimeMillis95thNumber).to.equal(19);

    done();
  });

  it('calculateStatsOddNumber', (done) => {
    const qt = [];
    for (let i = 1; i <= 21; i++) {
      qt.push(i);
    }

    const resp = qs.calculateStats(qt);
    expect(resp).to.be.an('object');
    expect(resp.averageQueueTimeMillis).to.equal('11.00ms');
    expect(resp.medianQueueTimeMillis).to.equal('11.00ms');
    expect(resp.queueTimeMillis95th).to.equal('20ms');
    expect(resp.queueTimeMillis95thNumber).to.equal(20);

    done();
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
      .catch((err) => {
        done(err);
      });
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
            expect(resp.averageQueueTimeMillis).to.equal('2.00ms');
            expect(resp.medianQueueTimeMillis).to.equal('2.00ms');
            expect(resp.queueTimeMillis95th).to.equal('2ms');
            expect(resp.timeStamp).to.equal(timestamp);
            expect(resp.queueTimeMillis95thNumber).to.equal(TWO);

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
      .catch((err) => {
        done(err);
      });
    }, 600);
  });
});
