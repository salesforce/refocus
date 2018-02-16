/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/jobQueue/bulkUpsert.js
 */
'use strict';
const jobQueue = require('../../../jobQueue/setup').jobQueue;
const jobType = require('../../../jobQueue/setup').jobType;
const bulkUpsertSamplesJob = require('../../../worker/jobs/bulkUpsertSamplesJob');
const getHierarchyJob = require('../../../worker/jobs/getHierarchyJob');
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../index').app);
const tu = require('../../testUtils');
const rtu = require('../models/redisTestUtil');
const samstoinit = require('../../../cache/sampleStoreInit');
const constants = require('../../../api/v1/constants');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const path = '/v1/samples/upsert/bulk';
const logger = require('../../../utils/activityLog').logger;
const RADIX = 10;

describe('tests/cache/jobQueue/bulkUpsert.js, ' +
'redisStore: POST using worker process' + path, () => {
  let token;

  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.toggleOverride('enableApiActivityLogs', false);
    tu.toggleOverride('enableWorkerActivityLogs', false);
    jobQueue.process(jobType.BULKUPSERTSAMPLES, bulkUpsertSamplesJob);
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then(() => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect2`,
      timeout: '10m',
      valueType: 'BOOLEAN',
      okRange: [10, 100],
    }))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
    }))
    .then(() => samstoinit.eradicate())
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDelete);
  after(tu.forceDeleteUser);
  after(() => {
    tu.toggleOverride('enableWorkerProcess', false);
    tu.toggleOverride('enableRedisSampleStore', false);
  });

  it('should return ok status with the job id for good ' +
      'or bad samples', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}NOT_EXIST|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '4',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.status).to.contain('OK');
      /* make sure that the jobId is returned as a part of the response. */
      expect(res.body.jobId).to.be.at.least(1);
    })
    .end((err) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('test logging', (done) => {
    tu.toggleOverride('enableApiActivityLogs', true);
    tu.toggleOverride('enableWorkerActivityLogs', true);
    logger.on('logging', testLogMessage);
    let workerLogged = false;
    let apiLogged = false;

    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}NOT_EXIST|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '4',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      //don't call done() yet, need to wait for data to be logged
    });

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
  });
});
