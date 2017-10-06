/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/auditEvents/post.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/auditEvents';

describe('tests/api/v1/auditEvents/post.js >', () => {
  let token;
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);
  const auditEventObj = u.getAuditEventObject();

  it('OK, simple post', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([auditEventObj])
    .expect(constants.httpStatus.OK)
    .end(done);
  });

  /*
   * Swagger converts the object to an array if swagger.yaml expects the
   * schema type of the request payload to be an array.
   */
  it('OK, posting an object that is not an array', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(auditEventObj)
    .expect(constants.httpStatus.OK)
    .end(done);
  });

  it('OK, multiple auditevents', (done) => {
    const auditEvent1 = u.getAuditEventObject();
    auditEvent1.resourceName = 'collector';
    auditEvent1.loggedAt = '2017-01-01';
    const auditEvent2 = u.getAuditEventObject();
    auditEvent2.resourceName = 'Aspect';
    auditEvent2.loggedAt = '2017-02-02';
    const auditEvent3 = u.getAuditEventObject();
    auditEvent3.resourceName = 'Subject';
    auditEvent3.loggedAt = '2017-03-03';
    api.post(path)
    .set('Authorization', token)
    .send([
      auditEvent1,
      auditEvent2,
      auditEvent3,
    ])
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('status', 'OK');
      setTimeout(() => {
        tu.db.AuditEvent.findAll()
        .then((o) => {
          expect(o.length).to.be.at.least(3);
          expect(o[0].resourceName).to.equal('collector');
          expect(o[1].resourceName).to.equal('Aspect');
          expect(o[2].resourceName).to.equal('Subject');
          done();
        }).catch(done);
      }, 100);
    });
  });

  it('NOT OK, missing resourceName', (done) => {
    const auditEvent1 = u.getAuditEventObject();
    delete auditEvent1.resourceName;
    const auditEvent2 = u.getAuditEventObject();
    auditEvent2.resourceName = 'Aspect';
    const auditEvent3 = u.getAuditEventObject();
    auditEvent3.resourceName = 'Subject';

    api.post(path)
    .set('Authorization', token)
    .send([
      auditEvent1,
      auditEvent2,
      auditEvent3,
    ])
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('SCHEMA_VALIDATION_FAILED');
      expect(res.body.errors[0].message).to.equal('Missing required ' +
          'property: resourceName');
      return done();
    });
  });

  it('NOT OK, missing resourceType', (done) => {
    const auditEvent1 = u.getAuditEventObject();
    const auditEvent2 = u.getAuditEventObject();
    auditEvent2.resourceName = 'Aspect';
    const auditEvent3 = u.getAuditEventObject();
    auditEvent3.resourceName = 'Subject';
    delete auditEvent3.resourceType;

    api.post(path)
    .set('Authorization', token)
    .send([
      auditEvent1,
      auditEvent2,
      auditEvent3,
    ])
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('SCHEMA_VALIDATION_FAILED');
      expect(res.body.errors[0].message).to.equal('Missing required ' +
          'property: resourceType');
      return done();
    });
  });
});
