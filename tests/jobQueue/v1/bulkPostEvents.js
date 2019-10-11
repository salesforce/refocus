/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/jobQueue/v1/bulkPostEvents.js
 */

const jobSetup = require('../../../jobQueue/setup');
const jobQueue = jobSetup.jobQueue;
const bulkPostEventsJob = require('../../../worker/jobs/bulkPostEvents');
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../express').app);
const tu = require('../../testUtils');
const u = require('./utils');
const constants = require('../../../api/v1/constants');
const path = '/v1/events/bulk';
const featureToggles = require('feature-toggles');
const bulkPostEventsQueue = jobSetup.bulkPostEventsQueue;

describe('tests/jobQueue/v1/bulkPostEvents.js, ' +
`api: POST using worker process ${path} >`, () => {
  let token;

  before(() => jobSetup.resetJobQueue());
  after(() => jobSetup.resetJobQueue());

  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.toggleOverride('enableApiActivityLogs', false);
    tu.toggleOverride('enableWorkerActivityLogs', false);
    if (featureToggles.isFeatureEnabled('enableBullForBulkPostEvents') &&
        featureToggles.isFeatureEnabled('anyBullEnabled')) {
      bulkPostEventsQueue.process((job, done) => {
        bulkPostEventsJob(job, done);
      });
    } else {
      jobQueue.process(jobSetup.jobType.bulkPostEvents, (job, done) => {
        bulkPostEventsJob(job, done);
      });
    }

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

  it('OK, Returns ok status with the jobId', (done) => {
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
    })
    .end(done);
  });
});
