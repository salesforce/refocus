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
const jobSetup = require('../../../jobQueue/setup');
const jobQueueKue = jobSetup.jobQueue;
const jobType = jobSetup.jobType;
const bulkUpsertSamplesJob = require('../../../worker/jobs/bulkUpsertSamples');
const getHierarchyJob = require('../../../worker/jobs/getHierarchy');
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../express').app);
const tu = require('../../testUtils');
const jobQueueTu = require('../../jobQueue/v1/utils');
const rtu = require('../models/redisTestUtil');
const samstoinit = require('../../../cache/sampleStoreInit');
const constants = require('../../../api/v1/constants');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const path = '/v1/samples/upsert/bulk';
const logger = require('../../../utils/activityLog').logger;
const featureToggles = require('feature-toggles');
const bulkUpsertSamplesQueue = jobSetup.bulkUpsertSamplesQueue;
const RADIX = 10;

describe('tests/cache/jobQueue/bulkUpsert.js, ' +
'redisStore: POST using worker process, ' + path + ' >', () => {
  before(() => jobSetup.resetJobQueue());
  after(() => jobSetup.resetJobQueue());

  let token;
  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.toggleOverride('enableApiActivityLogs', false);
    tu.toggleOverride('enableWorkerActivityLogs', false);
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before(() => {
    const simulateFailure = false;
    if (featureToggles.isFeatureEnabled('enableBullForBulkUpsertSamples')) {
      bulkUpsertSamplesQueue.process((job, done) => {
        if (simulateFailure) {
          done(new Error('Job Failed'));
        } else {
          bulkUpsertSamplesJob(job, done);
        }
      });
    } else {
      jobQueueKue.process(jobType.bulkDeleteSubjects, (job, done) => {
        if (simulateFailure) {
          done('Job Failed');
        } else {
          bulkUpsertSamplesJob(job, done);
        }
      });
    }
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
      valueType: 'NUMERIC',
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

  it('return ok status with job id for good or bad samples', (done) => {
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

  it('logging', (done) => {
    tu.toggleOverride('enableApiActivityLogs', true);
    tu.toggleOverride('enableWorkerActivityLogs', true);

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

      // don't call done() yet, need to wait for data to be logged
    });

    jobQueueTu.testWorkerAPiActivityLogs(done);
  }).timeout(10000);
});
