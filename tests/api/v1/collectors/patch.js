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
const jwtUtil = require('../../../../utils/jwtUtil');

describe('tests/api/v1/collectors/patch.js >', () => {
  let i = 0;
  let token;
  let collectorToken;

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
      collectorToken = jwtUtil.createToken(c.name, c.name);
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

  it('error, update version, user token provided instead of collector token',
  (done) => {
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send({ version: '1.1.1' })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description).to.be.equal(
        'Invalid/No Token provided.'
      );
      done();
    });
  });

  it('ok, update version, collector token provided', (done) => {
    api.patch(`${path}/${i}`)
    .set('Authorization', collectorToken)
    .send({ version: '1.1.1' })
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (tu.gotExpectedLength(res.body, 0)) {
        throw new Error('expecting collector');
      }

      if (res.body.version !== '1.1.1') {
        throw new Error('Incorrect version');
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
