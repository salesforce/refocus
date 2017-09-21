/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/auditevent/update.js
 */

'use strict';  // eslint-disable-line strict
const u = require('./utils');
const tu = require('../../../testUtils');
const AuditEvent = tu.db.AuditEvent;
const expect = require('chai').expect;

describe('tests/db/model/auditevent/update', () => {
  let auditEventDb;
  beforeEach((done) => {
    AuditEvent.create(u.auditEventObj)
    .then((ae) => {
      auditEventDb = ae;
      done();
    });
  });

  afterEach((done) => {
    u.forceDelete(done);
  });

  it('Update eventLog, OK', (done) => {
    expect(auditEventDb.eventLog).to.deep.equal({
      resourceName: 'abc-collector',
      resourceType: 'Collector',
      isError: false,
    });

    const newEventLog = {
      resourceName: 'new-collector',
      resourceType: 'CollectorUpdated',
      isError: true,
    };

    auditEventDb.update({ eventLog: newEventLog })
    .then((ae) => {
      expect(ae.eventLog.isError).to.be.equal(true);
      expect(ae.eventLog.resourceName)
        .to.be.equal('new-collector');
      expect(ae.eventLog.resourceType)
        .to.be.equal('CollectorUpdated');
      done();
    })
    .catch(done);
  });

  it('Error, Update with invalid loggedAt', (done) => {
    auditEventDb.update({ loggedAt: 'shouldBeBigInt' })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.dbErrorName);
      expect(err.message).to.contain('invalid input syntax for integer');
      done();
    });
  });

  it('Error, Update with invalid eventLog', (done) => {
    expect(auditEventDb.eventLog).to.deep.equal({
      resourceName: 'abc-collector',
      resourceType: 'Collector',
      isError: false,
    });

    const newEventLog = {
      resourceName: 1234,
      resourceType: 'CollectorUpdated',
      isError: true,
    };

    auditEventDb.update({ eventLog: newEventLog })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message).to.contain('\\"resourceName\\" must be a string');
      done();
    });
  });
});
