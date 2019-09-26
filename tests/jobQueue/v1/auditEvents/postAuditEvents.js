/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/jobQueue/v1/auditEvents/postAuditEvents.js
 */
'use strict'; // eslint-disable-line strict
const jobSetup = require('../../../../jobQueue/setup');
const jobQueue = jobSetup.jobQueue;
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/auditEvents';
const createAuditEventsJob =
  require('../../../../worker/jobs/createAuditEvents');
const featureToggles = require('feature-toggles');
const queueTestUtils = require('../../../jobQueue/v1/utils');
const createAuditEventsQueue = jobSetup.createAuditEventsQueue;


describe('tests/jobQueue/v1/auditEvents/post.js >', () => {
  before(() => jobSetup.resetJobQueue());
  after(() => jobSetup.resetJobQueue());

  let token;
  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.toggleOverride('enableWorkerActivityLogs', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => {
    tu.toggleOverride('enableWorkerProcess', false);
  });

  const ae1 = u.getAuditEventObject();
  const ae2 = u.getAuditEventObject();
  const ae3 = u.getAuditEventObject();

  it('OK, bulkCreate auditevents using worker process', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      ae1,
      ae2,
      ae3,
    ])
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.status).to.contain('OK');
      expect(res.body.jobId).to.be.at.least(1);
    })
    .then(() => {
      // call the worker
      if (featureToggles.isFeatureEnabled('enableBullForCreateAuditEvents') &&
        featureToggles.isFeatureEnabled('anyBullEnabled')) {
        createAuditEventsQueue.process((job, done) => {
          createAuditEventsJob(job, done);
        });
      } else {
        jobQueue.process(jobSetup.jobType.createAuditEvents, (job, done) => {
          createAuditEventsJob(job, done);
        });
      }

      setTimeout(() => {
        tu.db.AuditEvent.findAll()
        .then((o) => {
          expect(o.length).to.be.at.least(3);
          done();
        }).catch(done);
      }, 800);
    });
  });

  describe('with logging turned On', () => {
    it('worker activity logs should be logged correctly', (done) => {
      tu.toggleOverride('enableApiActivityLogs', true);
      tu.toggleOverride('enableWorkerActivityLogs', true);
      /**
       * An callback passed to the logging event to set the worker activity
       * logging
       * @param  {Object} transport - Information on where the log messages are
       * logged
       * @param  {String} level - Logging level
       * @param  {String} msg - The actual log message
       */
      api.post(path)
      .set('Authorization', token)
      .send([
        ae1,
        ae2,
        ae3,
      ])
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
      });
      queueTestUtils.testWorkerAPiActivityLogs(done);
    });
  });
});
