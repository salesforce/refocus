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
  const auditEventObj = u.getAuditEventObj();
  const aeObjAnother = {
    loggedAt: new Date('2017-12-30'),
    resourceName: 'abc-collector2',
    resourceType: 'Collector2',
    details: {
      d1: 'detail one',
    },
  };
  before((done) => {
    AuditEvent.create(u.getAuditEventObj())
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
      expect(ae.loggedAt).to.eql(new Date(auditEventObj.loggedAt));
      expect(ae.isError).to.be.equal(auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(auditEventObj.resourceType);
      done();
    })
    .catch(done);
  });

  it('Find, using loggedAt in where clause', (done) => {
    AuditEvent.findOne({ where: { loggedAt: auditEventObj.loggedAt } })
    .then((ae) => {
      expect(ae.loggedAt).to.eql(new Date(auditEventObj.loggedAt));
      expect(ae.isError).to.be.equal(auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(auditEventObj.resourceType);
      done();
    })
    .catch(done);
  });

  it('Find All, ordered by loggedAt', (done) => {
    AuditEvent.findAll()
    .then((objs) => {
      expect(objs.length).to.be.equal(2);
      const ae = objs[0];
      expect(ae.isError).to.be.equal(auditEventObj.isError);
      expect(ae.resourceName).to.be.equal(auditEventObj.resourceName);
      expect(ae.resourceType).to.be.equal(auditEventObj.resourceType);

      // verify loggedAt order
      expect(objs[0].loggedAt).to.eql(new Date(auditEventObj.loggedAt));
      expect(objs[1].loggedAt).to.eql(new Date(aeObjAnother.loggedAt));
      done();
    })
    .catch(done);
  });

  describe('date comparision on the loggedAt column', () => {
    const ae1 = u.getAuditEventObj();
    ae1.loggedAt = '2022-12-31';
    const ae2 = u.getAuditEventObj();
    ae2.loggedAt = '2023-12-31';
    const ae3 = u.getAuditEventObj();
    ae3.loggedAt = '2024-12-31';
    const ae4 = u.getAuditEventObj();
    ae4.loggedAt = '2025-12-31';
    const ae5 = u.getAuditEventObj();
    ae5.loggedAt = '2026-12-31';
    before((done) => {
      AuditEvent.bulkCreate([ae1,
        ae2,
        ae3,
        ae4,
        ae5,
      ])
      .then(() => done());
    });

    after((done) => {
      u.forceDelete(done);
    });

    it('less than a specific date', (done) => {
      AuditEvent.findAll(
        { where: {
          loggedAt: {
            $lt: new Date('2023-12-31'),
          },
        },
      })
      .then((o) => {
        expect(o.length).be.at.least(1);
        let err = true;
        let auditEvent;
        o.forEach((ae) => {
          if (ae.loggedAt.getTime() === (new Date(ae1.loggedAt).getTime())) {
            err = false;
            auditEvent = ae;
          }
        });
        if (err) {
          return done('Expecting to return a audit event logged at 2023-12-31');
        }

        expect(auditEvent.loggedAt).to.eql(new Date(ae1.loggedAt));
        expect(auditEvent.isError).to.be.equal(ae1.isError);
        expect(auditEvent.resourceName).to.be.equal(ae1.resourceName);
        expect(auditEvent.resourceType).to.be.equal(ae1.resourceType);
        return done();
      })
      .catch(done);
    });

    it('between a specific date range', (done) => {
      AuditEvent.findAll(
        { where: {
          loggedAt: {
            $lt: new Date('2027-01-01'),
            $gt: new Date('2022-12-30'),
          },
        },
      })
      .then((o) => {
        expect(o.length).equal(5);
        expect(o[0].loggedAt).to.eql(new Date(ae1.loggedAt));
        expect(o[1].loggedAt).to.eql(new Date(ae2.loggedAt));
        expect(o[2].loggedAt).to.eql(new Date(ae3.loggedAt));
        expect(o[3].loggedAt).to.eql(new Date(ae4.loggedAt));
        expect(o[4].loggedAt).to.eql(new Date(ae5.loggedAt));
        done();
      })
      .catch(done);
    });

    it('greater than a specific date', (done) => {
      AuditEvent.findAll(
        { where: {
          loggedAt: {
            $gt: new Date('2025-12-31'),
          },
        },
      })
      .then((o) => {
        expect(o.length).equal(1);
        expect(o[0].loggedAt).to.eql(new Date(ae5.loggedAt));
        expect(o[0].isError).to.be.equal(ae5.isError);
        expect(o[0].resourceName).to.be.equal(ae5.resourceName);
        expect(o[0].resourceType).to.be.equal(ae5.resourceType);
        done();
      })
      .catch(done);
    });
  });
});
