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
      expect(ae.isError).to.be.equal(u.auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(u.auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(u.auditEventObj.resourceType);
      expect(ae.details).to.deep.equal(u.auditEventObj.details);
      done();
    })
    .catch(done);
  });

  it('Create auditEvent, additional fields in details, OK', (done) => {
    auditEventObj.details.additionalInfo = 'some info';
    AuditEvent.create(auditEventObj)
    .then((ae) => {
      expect(ae.loggedAt).to.be.equal(u.auditEventObj.loggedAt.toString());
      expect(ae.isError).to.be.equal(u.auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(u.auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(u.auditEventObj.resourceType);
      expect(ae.details.additionalInfo).to.deep.equal('some info');
      done();
    })
    .catch(done);
  });

  it('Error, create auditEvent, no resourceName', (done) => {
    delete auditEventObj.resourceName;
    AuditEvent.create(auditEventObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('resourceName cannot be null');
      done();
    });
  });

  it('Error, create auditEvent, no resourceType', (done) => {
    delete auditEventObj.resourceType;
    AuditEvent.create(auditEventObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('resourceType cannot be null');
      done();
    });
  });

  it('Error, create auditEvent, no isError', (done) => {
    delete auditEventObj.isError;
    AuditEvent.create(auditEventObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('isError cannot be null');
      done();
    });
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

  it('Error, create auditEvent, null details', (done) => {
    delete auditEventObj.details;
    AuditEvent.create(auditEventObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain('details cannot be null');
      done();
    });
  });

  it('Error, create auditEvent, invalid resourceName', (done) => {
    // passes with value=123, converts 123 => '123'
    auditEventObj.resourceName = { a: 'a' };
    AuditEvent.create(auditEventObj)
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain(
        'resourceName cannot be an array or an object'
      );
      done();
    });
  });

  it('Error, create auditEvent, invalid resourceType', (done) => {
    auditEventObj.resourceType = { a: 'a' };
    AuditEvent.create(auditEventObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.message).to.contain(
        'resourceType cannot be an array or an object'
      );
      done();
    });
  });

  it('Error, create auditEvent, invalid isError', (done) => {
    auditEventObj.isError = 'a string';
    AuditEvent.create(auditEventObj)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeDatabaseError');
      expect(err.message).to.contain('invalid input syntax for type boolean');
      done();
    });
  });
});
