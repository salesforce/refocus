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
describe('tests/api/v1/auditEvents/post.js >', () => {
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

  it('bulkUpsert processed without errors should be in complete state ' +
    'without any error list', (done) => {
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
      jobQueue.process(jobSetup.jobType.BULKCREATE_AUDITEVENTS,
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
});
