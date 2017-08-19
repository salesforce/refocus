/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/patch.js
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

describe('tests/api/v1/collectors/patch.js >', () => {
  let i = 0;
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

  it('update description', (done) => {
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send({ description: 'abcdefg' })
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (tu.gotExpectedLength(res.body, 0)) {
        throw new Error('expecting collector');
      }

      if (res.body.description !== 'abcdefg') {
        throw new Error('Incorrect description');
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('error - resource not found', (done) => {
    api.put(`${path}/doesNotExist`)
    .set('Authorization', token)
    .send({ description: 'abcdefg' })
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      done();
    });
  });
});
