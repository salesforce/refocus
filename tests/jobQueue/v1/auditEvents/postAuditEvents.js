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
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/auditEvents';
const createAuditEventsJob =
  require('../../../../worker/jobs/createAuditEventsJob');
const logger = require('../../../../utils/activityLog').logger;

describe('tests/jobQueue/v1/auditEvents/post.js >', () => {
  let token;
  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
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
      jobQueue.process(jobSetup.jobType.BULK_CREATE_AUDIT_EVENTS,
        createAuditEventsJob);

      setTimeout(() => {
        tu.db.AuditEvent.findAll()
        .then((o) => {
          expect(o.length).to.be.at.least(3);
          done();
        }).catch(done);
      }, 200);
    });
  });

  describe('with logging turned On', () => {
    before((done) => {
      tu.toggleOverride('enableWorkerActivityLogs', true);
      done();
    });
    after((done) => {
      tu.toggleOverride('enableWorkerActivityLogs', false);
      done();
    });

    it('worker activity logs should be logged correctly', (done) => {

      /**
       * An callback passed to the logging event to set the worker activity
       * logging
       * @param  {Object} transport - Information on where the log messages are
       * logged
       * @param  {String} level - Logging level
       * @param  {String} msg - The actual log message
       */
      function testLogMessage(transport, level, msg) {
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
            expect(logObj.jobType).to.equal('BULK_CREATE_AUDIT_EVENTS');
            expect(logObj.recordCount).to.equal('3');
            logger.removeListener('logging', testLogMessage);
            done();
          } catch (err) {
            done(err);
          }
        }
      }

      logger.on('logging', testLogMessage);
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
        jobQueue.process(jobSetup.jobType.BULK_CREATE_AUDIT_EVENTS,
          createAuditEventsJob);

        // done is called in the call back passed to the "logging" event
      });
    });
  });
});
