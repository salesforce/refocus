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

describe('redisStore: POST using worker process' + path, () => {
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

  // force the job queue to enter the test mode.
  beforeEach((done) => {
    jobQueue.testMode.enter();
    done();
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

  afterEach(() => {
    jobQueue.testMode.clear();
  });

  after(rtu.forceDelete);
  after(rtu.flushRedis);
  after(() => {
    tu.toggleOverride('enableWorkerProcess', false);
    tu.toggleOverride('enableRedisSampleStore', false);
  });

  it('sample bulkUpsert should be sent to the queue', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(constants.httpStatus.OK)
    .end((err) => {
      if (err) {
        done(err);
      }

      // make sure only 1 job is created for each bulk upsert call
      expect(jobQueue.testMode.jobs.length).to.equal(1);

      // make sure the job type is correct
      expect(jobQueue.testMode.jobs[0].type)
        .to.equal(jobType.BULKUPSERTSAMPLES);

      // make sure the queue has the right data inside it
      expect(jobQueue.testMode.jobs[0].data.upsertData).to.have.length(2);
      expect(jobQueue.testMode.jobs[0].data.upsertData[0])
        .to.have.all.keys('name', 'value');
      done();
    });
  });

  it('should still return ok for good or bad samples', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}NOT_EXIST|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(constants.httpStatus.OK)
    .expect((res) => expect(res.body.status).to.contain('OK'))
    .end((err) => {
      if (err) {
        done(err);
      }

      done();
    });
  });
});
