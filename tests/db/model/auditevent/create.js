/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/auditevent/create.js
 */

'use strict';  // eslint-disable-line strict
const u = require('./utils');
const tu = require('../../../testUtils');
const AuditEvent = tu.db.AuditEvent;
const expect = require('chai').expect;

describe('tests/db/model/auditevent/create', () => {
  let auditEventObj;
  beforeEach((done) => {
    auditEventObj = JSON.parse(JSON.stringify(u.auditEventObj));
    done();
  });

  afterEach((done) => {
    u.forceDelete(done);
  });

  it('Create auditEvent, OK', (done) => {
    AuditEvent.create(auditEventObj)
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

  it('Error, create auditEvent, null loggedAt', (done) => {
    delete auditEventObj.loggedAt;
    AuditEvent.create(auditEventObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('loggedAt cannot be null');
      done();
    });
  });

  it('Error, create auditEvent, null eventLog', (done) => {
    delete auditEventObj.eventLog;
    AuditEvent.create(auditEventObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('eventLog cannot be null');
      done();
    });
  });

  it('Error, create auditEvent, invalid eventLog resourceName', (done) => {
    auditEventObj.eventLog.resourceName = 123;
    AuditEvent.create(auditEventObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('\\"resourceName\\" must be a string');
      done();
    });
  });

  it('Error, create auditEvent, invalid eventLog resourceType', (done) => {
    auditEventObj.eventLog.resourceType = 567;
    AuditEvent.create(auditEventObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('\\"resourceType\\" must be a string');
      done();
    });
  });

  it('Error, create auditEvent, invalid eventLog isError', (done) => {
    auditEventObj.eventLog.isError = 'yes';
    AuditEvent.create(auditEventObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('\\"isError\\" must be a boolean');
      done();
    });
  });
});
