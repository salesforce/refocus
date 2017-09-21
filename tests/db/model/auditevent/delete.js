/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/auditevent/delete.js
 */

'use strict';  // eslint-disable-line strict
const u = require('./utils');
const tu = require('../../../testUtils');
const AuditEvent = tu.db.AuditEvent;
const expect = require('chai').expect;

describe('tests/db/model/auditevent/delete', () => {
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

  it('ok, bulk delete', (done) => {
    AuditEvent.destroy({ where: { id: auditEventDb.id } })
    .then(() => AuditEvent.findAll())
    .then((res) => {
      expect(res.length).to.be.equal(0);
      done();
    })
    .catch(done);
  });

  it('ok, an instance delete', (done) => {
    AuditEvent.findById(auditEventDb.id)
    .then((c) => c.destroy())
    .then((o) => {
      if (o.deletedAt && (o.isDeleted !== 0)) {
        done();
      } else {
        done(new Error('expecting it to be soft-deleted'));
      }
    })
    .catch(done);
  });

  it('ok, should not be able to find an auditEvent once deleted', (done) => {
    AuditEvent.findById(auditEventDb.id)
    .then((c) => c.destroy())
    .then((o) => AuditEvent.findById(o.id))
    .then((o) => {
      expect(o).to.equal(null);
      done();
    })
    .catch(done);
  });
});
