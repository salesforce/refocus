/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/jobQueue/v1/bulkUpsert.js
 */
'use strict'; // eslint-disable-line strict
const jobSetup = require('../../../jobQueue/setup');
const jobQueueKue = jobSetup.jobQueue;
const jobType = jobSetup.jobType;
const bulkUpsertSamplesJob = require('../../../worker/jobs/bulkUpsertSamples');
const expect = require('chai').expect;
const supertest = require('supertest');
const featureToggles = require('feature-toggles');
const api = supertest(require('../../../express').app);
const tu = require('../../testUtils');
const u = require('./utils');
const constants = require('../../../api/v1/constants');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const bulkUpsertSamplesQueue = jobSetup.bulkUpsertSamplesQueue;
const path = '/v1/samples/upsert/bulk';

describe('tests/jobQueue/v1/bulkUpsert.js, ' +
`api: POST using worker process ${path} >`, () => {
  let token;

  before(() => jobSetup.resetJobQueue());
  after(() => jobSetup.resetJobQueue());

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
      jobQueueKue.process(jobType.bulkUpsertSamples, (job, done) => {
        if (simulateFailure) {
          done('Job Failed');
        } else {
          bulkUpsertSamplesJob(job, done);
        }
      });
    }
  });

  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.toggleOverride('enableApiActivityLogs', false);
    tu.toggleOverride('enableWorkerActivityLogs', false);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      return done();
    })
    .catch((err) => done(err));
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
    .then(() => done())
    .catch((err) => done(err));
  });

  before(u.populateRedis);
  after(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => {
    tu.toggleOverride('enableWorkerProcess', false);
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
    .end(done);
  });

  it('test logging', (done) => {
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

    u.testWorkerAPiActivityLogs(done);
  });

  describe('force create job to return error >', () => {
    if (!featureToggles.isFeatureEnabled('enableBullForBulkUpsertSamples')) {
      before((done) => {
        jobQueueKue.testMode.enter();
        done();
      });
      after((done) => {
        jobQueueKue.testMode.exit();
        done();
      });
      it('should return 400: bad request', (done) => {
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
        .expect(constants.httpStatus.BAD_REQUEST)
        .end(done);
      });
    }
  });
});

