/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/auditEvents/get.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const AuditEvent = tu.db.AuditEvent;
const u = require('./utils');
const path = '/v1/auditEvents';

describe('tests/api/v1/auditEvents/get.js >', () => {
  let token;
  const auditEvent1 = u.createAuditEventObject('Collector', 'Generator',
    '2017-01-01', 'true');
  const auditEvent2 = u.createAuditEventObject('Refocus', 'Aspect',
    '2017-02-02');
  const auditEvent3 = u.createAuditEventObject('Refocus', 'Subject',
    '2017-03-03');
  const auditEvent4 = u.createAuditEventObject('Refocus', 'Sample',
    '2017-04-04');
  const auditEvent5 = u.createAuditEventObject('Collector', 'GeneratorTemplate',
    '2017-05-05');
  const auditEvent6 = u.createAuditEventObject('Collector', 'Generator',
    '2017-06-06');

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
    }).then(() => AuditEvent.bulkCreate([auditEvent1,
      auditEvent2,
      auditEvent3,
      auditEvent4,
      auditEvent5,
      auditEvent6,
      ]))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('OK, Get all auditEvents ', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(6);
      expect(res.body[0].resourceName).to.equal('Generator');
      expect(res.body[1].resourceName).to.equal('Aspect');
      expect(res.body[2].resourceName).to.equal('Subject');
      expect(res.body[3].resourceName).to.equal('Sample');
      expect(res.body[4].resourceName).to.equal('GeneratorTemplate');
      expect(res.body[5].resourceName).to.equal('Generator');
      done();
    });
  });

  it('get auditevents by resourceType', (done) => {
    api.get(`${path}?resourceType=collector`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(3);
      expect(res.body[0].resourceType).to.equal('Collector');
      expect(res.body[0].resourceName).to.equal('Generator');
      expect(res.body[1].resourceType).to.equal('Collector');
      expect(res.body[1].resourceName).to.equal('GeneratorTemplate');
      expect(res.body[2].resourceType).to.equal('Collector');
      expect(res.body[2].resourceName).to.equal('Generator');
      return done();
    });
  });

  it('get auditevents by resourceType and resourceName', (done) => {
    api.get(`${path}?resourceType=refocus&resourceName=subject`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(1);
      expect(res.body[0].resourceType).to.equal('Refocus');
      expect(res.body[0].resourceName).to.equal('Subject');
      expect(new Date(res.body[0].loggedAt)).to
        .eql(new Date(auditEvent3.loggedAt));
      return done();
    });
  });

  it('wild card searches should work as well', (done) => {
    api.get(`${path}?resourceName=s*`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(2);
      expect(res.body[0].resourceType).to.equal('Refocus');
      expect(res.body[0].resourceName).to.equal('Subject');
      expect(res.body[1].resourceType).to.equal('Refocus');
      expect(res.body[1].resourceName).to.equal('Sample');
      return done();
    });
  });

  it('get auditEvent by error type', (done) => {
    api.get(`${path}?isError=true`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(1);
      expect(res.body[0].resourceType).to.equal('Collector');
      expect(res.body[0].resourceName).to.equal('Generator');
      return done();
    });
  });

  it('get auditEvent by combining resourceName, resourceType and ' +
    'isError filters', (done) => {
    api.get(`${path}?isError=true&resourceName=Generator` +
      '&resourceType=collector')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(1);
      expect(res.body[0].resourceType).to.equal('Collector');
      expect(res.body[0].resourceName).to.equal('Generator');
      return done();
    });
  });
});
