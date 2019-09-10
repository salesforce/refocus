/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/jobQueue/v1/getBulkPostEventStatus.js
 */

const jobSetup = require('../../../jobQueue/setup');
const jobQueue = jobSetup.jobQueue;
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../express').app);
const tu = require('../../testUtils');
const u = require('./utils');
const constants = require('../../../api/v1/constants');
const path = '/v1/events/bulk';
const getStatusPath = '/v1/events/bulk/{jobId}/status';
const bulkPostEventsJob = require('../../../worker/jobs/bulkPostEvents');
const timeoutMillis = 300;

describe('tests/jobQueue/v1/getBulkPostEventStatus.js, ' +
`api: GET ${getStatusPath} >`, () => {
  before(() => jobSetup.resetJobQueue());
  after(() => jobSetup.resetJobQueue());

  let token;
  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      return done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => {
    tu.toggleOverride('enableWorkerProcess', false);
  });

  it('OK, bulkPostEvents processed without errors should be in complete ' +
    'state without any errors', (done) => {
    let jobId;
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        log: 'Something cool happened!',
      },
      {
        log: 'Something even cooler happened!',
      },
    ])
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.status).to.contain('OK');
      expect(res.body).to.have.property('jobId');
      jobId = res.body.jobId;
    })
    .then(() => {
      // call the worker
      jobQueue.process(jobSetup.jobType.bulkPostEvents,
        bulkPostEventsJob);

      /*
       * Bulk API is asynchronous. The delay is used to give time for upsert
       * operation to complete.
       */
      setTimeout(() => {
        api.get(getStatusPath.replace('{jobId}', jobId))
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.status).to.equal('complete');
          expect(res.body.errors.length).to.equal(0);
          done();
        });
      }, timeoutMillis);
    });
  });

  it('FAIL, bulkPostEvents is in complete state but processed ' +
    ' with an error', (done) => {
    let jobId;
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        log: 'Something cool happened!',
      },
      {
        log: 'Something even cooler happened!',
        roomId: 123456789,
      },
    ])
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.status).to.contain('OK');
      expect(res.body).to.have.property('jobId');
      jobId = res.body.jobId;
    })
    .then(() => {
      // call the worker
      jobQueue.process(jobSetup.jobType.bulkPostEvents,
        bulkPostEventsJob);

      /*
      * Bulk API is asynchronous. The delay is used to give time for upsert
      * operation to complete.
      */
      setTimeout(() => {
        api.get(getStatusPath.replace('{jobId}', jobId))
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.status).to.equal('complete');
          expect(res.body.errors.length).to.equal(1);
          done();
        });
      }, timeoutMillis);
    });
  });
});
