/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/start.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/collectors/{key}/start';
const Collector = tu.db.Collector;
const expect = require('chai').expect;

describe('tests/api/v1/collectors/start.js >', () => {
  let i = 0;
  const asp = u.toCreate;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Collector.create(u.toCreate)
    .then((c) => {
      i = c.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('ok', (done) => {
    api.post(path.replace('{key}', i))
    .set('Authorization', token)
    .send({})
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.status).to.be.equal('Running');
    })
    .end(done);
  });

  it('test invalid state changes');

  it('Reject when the user token is invalid', (done) => {
    api.post(path.replace('{key}', i))
    .set('Authorization', 'iDontExist')
    .send({})
    .expect(constants.httpStatus.FORBIDDEN)
    .expect((res) => {
      expect(res.body.errors[0].description).to.equal('Invalid Token.');
    })
    .end(done);
  });

  // need token id to revoke it
  it('Reject when the user token is revoked');

  it('if the collector is not registered, throw an error.', (done) => {
    Collector.findById(i)
    .then((collector) => collector.update({ registered: false }))
    .then(() => {
      api.post(path.replace('{key}', i))
      .set('Authorization', token)
      .send({})
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });
  });

  it('if the collector is registered but status is PAUSED or RUNNING, ' +
    'throw an error.', (done) => {
      done();
    // Collector.findById(i)
    // .then((collector) => collector.update({ status: 'Paused' }))
    // .then(() => {
    //   api.post(path.replace('{key}', i))
    //   .set('Authorization', token)
    //   .send({})
    //   .expect(constants.httpStatus.FORBIDDEN)
    //   .end(done);
    // });
  });

  it('if the collector is registered and status is STOPPED, set status=RUNNING and ' +
    'return a collector token');
  it('if not found, create a new collector record with isRegistered=true and ' +
    'status=RUNNING, and return a collector token');
});
