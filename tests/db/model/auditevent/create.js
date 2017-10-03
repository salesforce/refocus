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
    auditEventObj = u.getAuditEventObj();
    done();
  });

  after((done) => {
    u.forceDelete(done);
  });

  it('Create auditEvent, OK', (done) => {
    AuditEvent.create(auditEventObj)
    .then((ae) => {
      expect(ae.loggedAt).to.eql(new Date(auditEventObj.loggedAt));
      expect(ae.isError).to.be.equal(auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(auditEventObj.resourceType);
      expect(ae.details).to.deep.equal(auditEventObj.details);
      done();
    })
    .catch(done);
  });

  it('Create auditEvent, additional fields in details, OK', (done) => {
    auditEventObj.details.additionalInfo = 'some info';
    AuditEvent.create(auditEventObj)
    .then((ae) => {
      expect(ae.loggedAt).to.eql(new Date(auditEventObj.loggedAt));
      expect(ae.isError).to.be.equal(auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(auditEventObj.resourceType);
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

  it('Ok, Create auditEvent with null isError, default to false', (done) => {
    delete auditEventObj.isError;
    AuditEvent.create(auditEventObj)
    .then((ae) => {
      expect(ae.loggedAt).to.eql(new Date(auditEventObj.loggedAt));
      expect(ae.isError).to.be.equal(false);
      expect(ae.resourceName).to.be.equal(auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(auditEventObj.resourceType);
      done();
    })
    .catch(done);
  });

  it('Ok, Create auditEvent with null loggedAt, default to current time',
  (done) => {
    delete auditEventObj.loggedAt;
    AuditEvent.create(auditEventObj)
    .then((ae) => {
      expect(ae.loggedAt).to.not.be.equal(undefined);
      expect(ae.isError).to.be.equal(auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(auditEventObj.resourceType);
      done();
    })
    .catch(done);
  });

  it('Ok, create auditEvent with no details, details must default ' +
    'to an empty object', (done) => {
    delete auditEventObj.details;
    AuditEvent.create(auditEventObj)
    .then((ae) => {
      expect(ae.loggedAt).to.not.be.equal(undefined);
      expect(ae.isError).to.be.equal(auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(auditEventObj.resourceType);
      expect(ae.details).to.deep.equal({});
      done();
    })
    .catch(done);
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

  it('OK, use bulkCreate to create multiple auditEvents', (done) => {
    let totalRows;
    AuditEvent.findAll()
    .then((o) => {
      totalRows = o.length;
      return AuditEvent.bulkCreate([auditEventObj,
        auditEventObj,
        auditEventObj,
        ]);
    })
    .then(() => AuditEvent.findAll())
    .then((o) => {
      expect(o).to.have.lengthOf(totalRows + 3);
      done();
    })
    .catch(done);
  });
});
