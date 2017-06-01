/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/jobQueue/getBulkUpsertStatus.js
 */
'use strict'; // eslint-disable-line strict

const jobSetup = require('../../../jobQueue/setup');
const jobQueue = jobSetup.jobQueue;
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
const getStatusPath = '/v1/samples/upsert/bulk/{jobId}/status';
const bulkUpsertSamplesJob =
  require('../../../worker/jobs/bulkUpsertSamplesJob');

describe('api: GET ' + getStatusPath, () => {
  let token;

  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
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
    .catch((err) => done(err));
  });

  after(rtu.forceDelete);
  after(rtu.flushRedis);
  after(() => {
    tu.toggleOverride('enableWorkerProcess', false);
    tu.toggleOverride('enableRedisSampleStore', false);
  });

  it('bulkUpsert processed without errors should be in complete state ' +
    'without any error list', (done) => {
    let jobId;
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '10',
      },
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '10',
      }
    ])
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.status).to.contain('OK');
      // make sure that the jobId is returned as a part of the response.
      expect(res.body.jobId).to.be.at.least(1);
      jobId = res.body.jobId;
    })
    .then(() => {
      // call the worker
      jobQueue.process(jobSetup.jobType.BULKUPSERTSAMPLES,
        bulkUpsertSamplesJob);

      /*
       * the bulk api is asynchronous. The delay is used to give sometime for
       * the upsert operation to complete
       */
      setTimeout(() => {
        api.get(getStatusPath.replace('{jobId}', jobId))
        .end((err, res) => {
          if (err) {
            done(err);
          }
          expect(res.body.status).to.equal('complete');
          expect(res.body.errors.length).to.equal(0);
          return done();
        });
      }, 500);
    });
  });

  it('complete bulk upsert job should list the right errors', (done) => {
    let jobId;
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '10',
      },
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '10',
      },
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '10',
        status: 'Info'
      },
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}_InvalidAspect`,
        value: '10',
      }

    ])
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.status).to.contain('OK');
      // make sure that the jobId is returned as a part of the response.
      expect(res.body.jobId).to.be.at.least(1);
      jobId = res.body.jobId;
    })
    .then(() => {
      // call the worker
      jobQueue.process(jobSetup.jobType.BULKUPSERTSAMPLES,
        bulkUpsertSamplesJob);

      /*
       * the bulk api is asynchronous. The delay is used to give sometime for
       * the upsert operation to complete
       */
      setTimeout(() => {
        api.get(getStatusPath.replace('{jobId}', jobId))
        .end((err, res) => {
          if (err) {
            done(err);
          }
          expect(res.body.status).to.equal('complete');
          expect(res.body.errors.length).to.equal(2);
          expect(res.body.errors[0].name).to.equal('ValidationError');
          expect(res.body.errors[1].name).to.equal('ResourceNotFoundError');

          return done();
        });
      }, 500);
    });
  });

  it('Even when hundreds of upserts fail, the valid upsert should ' +
    ' be successful', (done) => {
    let jobId;
    const toUpsert = [];

    // read-only field validation error
    for (let i = 0;i< 50;i++) {
      toUpsert.push({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '10',
        status: 'Info',
      });
    }

    // invalid aspect
    for (let i = 0;i< 25;i++) {
      toUpsert.push({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect_Invalid`,
        value: '10',
      });
    }

    // invalid subject
    for (let i = 0;i< 25;i++) {
      toUpsert.push({
        name: `${tu.namePrefix}Subject_Invalid|${tu.namePrefix}Aspect1`,
        value: '10',
      });
    }

    // valid upsert
    toUpsert.push({
      name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
      value: '10',
    });
    api.post(path)
    .set('Authorization', token)
    .send(toUpsert)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.status).to.contain('OK');
      // make sure that the jobId is returned as a part of the response.
      expect(res.body.jobId).to.be.at.least(1);
      jobId = res.body.jobId;
    })
    .then(() => {
      // call the worker
      jobQueue.process(jobSetup.jobType.BULKUPSERTSAMPLES,
        bulkUpsertSamplesJob);

      /*
       * the bulk api is asynchronous. The delay is used to give sometime for
       * the upsert operation to complete
       */
      setTimeout(() => {
        api.get(getStatusPath.replace('{jobId}', jobId))
        .end((err, res) => {
          if (err) {
            done(err);
          }
          expect(res.body.status).to.equal('complete');
          expect(res.body.errors.length).to.equal(100);
          return done();
        });
      }, 500);
    });
  });
});
