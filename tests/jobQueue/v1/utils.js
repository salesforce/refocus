/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/jobQueue/v1/utils.js
 */
'use strict';

const tu = require('../../testUtils');
const testStartTime = new Date();
const rcli = require('../../../cache/redisCache').client.sampleStore;
const samstoinit = require('../../../cache/sampleStoreInit');
const Promise = require('bluebird');
const logger = require('../../../utils/activityLog').logger;
const expect = require('chai').expect;
const RADIX = 10;

function testWorkerAPiActivityLogs(done) {
  let workerLogged = false;
  let apiLogged = false;
  logger.on('logging', testLogMessage);

  function testLogMessage(transport, level, msg, meta) {
    const logObj = {};
    msg.split(' ').forEach((entry) => {
      logObj[entry.split('=')[0]] = entry.split('=')[1];
    });

    if (logObj.activity === 'worker') {
      try {
        expect(logObj.totalTime).to.match(/\d+ms/);
        expect(logObj.queueTime).to.match(/\d+ms/);
        expect(logObj.queueResponseTime).to.match(/\d+ms/);
        expect(logObj.workTime).to.match(/\d+ms/);
        expect(logObj.dbTime).to.match(/\d+ms/);
        expect(logObj.recordCount).to.equal('2');
        expect(logObj.errorCount).to.equal('1');

        const totalTime = parseInt(logObj.totalTime, RADIX);
        const queueTime = parseInt(logObj.queueTime, RADIX);
        const queueResponseTime = parseInt(logObj.queueResponseTime, RADIX);
        const workTime = parseInt(logObj.workTime, RADIX);
        const dbTime = parseInt(logObj.dbTime, RADIX);

        expect(workTime).to.be.at.least(dbTime);
        expect(totalTime).to.be.at.least(workTime);
        expect(totalTime).to.be.at.least(queueTime);
        expect(totalTime).to.be.at.least(queueResponseTime);
        expect(queueTime + workTime + queueResponseTime).to.equal(totalTime);

        workerLogged = true;
        if (workerLogged && apiLogged) {
          logger.removeListener('logging', testLogMessage);
          tu.toggleOverride('enableApiActivityLogs', false);
          tu.toggleOverride('enableWorkerActivityLogs', false);
          done();
        }
      } catch (err) {
        done(err);
      }
    }

    if (logObj.activity === 'api') {
      try {
        expect(logObj.totalTime).to.match(/\d+ms/);
        expect(logObj.dbTime).to.match(/\d+ms/);
        expect(logObj.recordCount).to.equal('3');
        expect(logObj.responseBytes).to.match(/\d+/);

        const totalTime = parseInt(logObj.totalTime, RADIX);
        const dbTime = parseInt(logObj.dbTime, RADIX);

        expect(totalTime).to.be.above(dbTime);

        apiLogged = true;
        if (workerLogged && apiLogged) {
          logger.removeListener('logging', testLogMessage);
          tu.toggleOverride('enableApiActivityLogs', false);
          tu.toggleOverride('enableWorkerActivityLogs', false);
          done();
        }
      } catch (err) {
        done(err);
      }
    }
  };
}

module.exports = {
  forceDelete(done) {
    Promise.join(
      rcli.flushallAsync(),
      tu.forceDelete(tu.db.Aspect, testStartTime)
      .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    )
    .then(() => done())
    .catch(done);
  },

  populateRedis(done) {
    samstoinit.populate()
    .then(() => done())
    .catch(done);
  },

  testWorkerAPiActivityLogs,
};
