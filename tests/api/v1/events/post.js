/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/events/post.js
 */

'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/events';
const expect = require('chai').expect;
const ZERO = 0;
const tu = require('../../../testUtils');

describe(`api: POST ${path}`, () => {
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  afterEach(tu.forceDeleteUser);

  describe('POST event', () => {
    it('Pass, post event', (done) => {
      api.post(`${path}`)
      .set('Authorization', token)
      .send(u.getStandard())
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.name).to.equal(u.name);
        done();
      });
    });

    it('Fail, duplicate event', (done) => {
      u.createStandard()
      .then(() => done());

      api.post(`${path}`)
      .set('Authorization', token)
      .send(u.getStandard())
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          done(err);
        }
        expect(res.body.errors[ZERO].type).to
        .contain('SequelizeUniqueConstraintError');
      });
    });

    it('Fail, event validation incorrect', (done) => {
      let testEvent = u.getStandard();
      testEvent.actions = 'INVALID_VALUE';

      api.post(`${path}`)
      .set('Authorization', token)
      .send(testEvent)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          done(err);
        }
        expect(res.body.errors[ZERO].type).to
        .contain('SCHEMA_VALIDATION_FAILED');
        done();
      });
    });
  });
});

