/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/get.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/collectors';
const Collector = tu.db.Collector;
const expect = require('chai').expect;

describe('tests/api/v1/collectors/get.js >', () => {
  let token;
  let cid;

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
      cid = c.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('get by name ok', (done) => {
    api.get(path + '/' + u.toCreate.name)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.id).to.equal(cid);
    })
    .end(done);
  });

  it('get by id ok', (done) => {
    api.get(path + '/' + cid)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.id).to.equal(cid);
    })
    .end(done);
  });

  it('find ok', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.length).to.equal(1);
    })
    .end(done);
  });

  it('get with limit ok', (done) => {
    const c2 = u.toCreate;
    c2.name = c2.name + '2';
    Collector.create(c2)
    .then(() => {
      api.get(path + '?limit=1')
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.length).to.equal(1);
      })
      .end(done);
    })
    .catch(done);
  });
});
