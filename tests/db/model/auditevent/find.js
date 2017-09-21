/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/auditevent/find.js
 */

'use strict';  // eslint-disable-line strict
const u = require('./utils');
const tu = require('../../../testUtils');
const AuditEvent = tu.db.AuditEvent;
const expect = require('chai').expect;

describe('tests/db/model/auditevent/find', () => {
  let auditEventDb;
  before((done) => {
    AuditEvent.create(u.auditEventObj)
    .then((ae) => {
      auditEventDb = ae;
      done();
    });
  });

  after((done) => {
    u.forceDelete(done);
  });

  it('Find by Id', (done) => {
    AuditEvent.findById(auditEventDb.id)
    .then((ae) => {
      expect(ae.loggedAt).to.be.equal(u.auditEventObj.loggedAt.toString());
      expect(ae.eventLog.isError).to.be.equal(u.auditEventObj.eventLog.isError);
      expect(ae.eventLog.resourceName)
        .to.be.equal(u.auditEventObj.eventLog.resourceName);
      expect(ae.eventLog.resourceType)
        .to.be.equal(u.auditEventObj.eventLog.resourceType);
      done();
    })
    .catch(done);
  });

  it('Find, using where', (done) => {
    AuditEvent.findOne({ where: { loggedAt: u.auditEventObj.loggedAt } })
    .then((ae) => {
      expect(ae.loggedAt).to.be.equal(u.auditEventObj.loggedAt.toString());
      expect(ae.eventLog.isError).to.be.equal(u.auditEventObj.eventLog.isError);
      expect(ae.eventLog.resourceName)
        .to.be.equal(u.auditEventObj.eventLog.resourceName);
      expect(ae.eventLog.resourceType)
        .to.be.equal(u.auditEventObj.eventLog.resourceType);
      done();
    })
    .catch(done);
  });

  it('Find All', (done) => {
    AuditEvent.findAll()
    .then((objs) => {
      expect(objs.length).to.be.equal(1);
      const ae = objs[0];
      expect(ae.loggedAt).to.be.equal(u.auditEventObj.loggedAt.toString());
      expect(ae.eventLog.isError).to.be.equal(u.auditEventObj.eventLog.isError);
      expect(ae.eventLog.resourceName)
        .to.be.equal(u.auditEventObj.eventLog.resourceName);
      expect(ae.eventLog.resourceType)
        .to.be.equal(u.auditEventObj.eventLog.resourceType);
      done();
    })
    .catch(done);
  });
});
