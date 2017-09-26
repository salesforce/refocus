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
  const aeObjAnother = {
    loggedAt: Date.parse('Sept 23, 2017'),
    resourceName: 'abc-collector2',
    resourceType: 'Collector2',
    isError: false,
    details: {
      d1: 'detail one',
    },
  };
  before((done) => {
    AuditEvent.create(u.auditEventObj)
    .then((ae) => {
      auditEventDb = ae;
      return AuditEvent.create(aeObjAnother);
    })
    .then(() => done());
  });

  after((done) => {
    u.forceDelete(done);
  });

  it('Find by Id', (done) => {
    AuditEvent.findById(auditEventDb.id)
    .then((ae) => {
      expect(ae.loggedAt).to.be.equal(u.auditEventObj.loggedAt.toString());
      expect(ae.isError).to.be.equal(u.auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(u.auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(u.auditEventObj.resourceType);
      done();
    })
    .catch(done);
  });

  it('Find, using loggedAt in where clause', (done) => {
    AuditEvent.findOne({ where: { loggedAt: u.auditEventObj.loggedAt } })
    .then((ae) => {
      expect(ae.loggedAt).to.be.equal(u.auditEventObj.loggedAt.toString());
      expect(ae.isError).to.be.equal(u.auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(u.auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(u.auditEventObj.resourceType);
      done();
    })
    .catch(done);
  });

  it('Find All, ordered by loggedAt', (done) => {
    AuditEvent.findAll()
    .then((objs) => {
      expect(objs.length).to.be.equal(2);
      const ae = objs[0];
      expect(ae.isError).to.be.equal(u.auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(u.auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(u.auditEventObj.resourceType);

      // verify loggedAt order
      expect(objs[0].loggedAt).to.be.equal(u.auditEventObj.loggedAt.toString());
      expect(objs[1].loggedAt).to.be.equal(aeObjAnother.loggedAt.toString());
      done();
    })
    .catch(done);
  });
});
