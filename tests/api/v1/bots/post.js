/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/bots/post.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/bots';
const expect = require('chai').expect;
const ZERO = 0;
const tu = require('../../../testUtils');
const jwtUtil = require('../../../../utils/jwtUtil');

describe('tests/api/v1/bots/post.js >', () => {
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
  after(tu.forceDeleteToken);

  it('Pass, post bot', (done) => {
    api.post(`${path}`)
    .set('Authorization', token)
    .field('name', u.name)
    .field('url', 'https://www.foo.com')
    .attach('ui', 'tests/api/v1/bots/uiBlob')
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const fakeToken = jwtUtil
        .createToken(u.name + 'Fail', u.name + 'Fail');

      // since createToken uses current timestamp, the token value is not fixed.
      expect(res.body.token).to.not.equal(undefined);
      expect(res.body.token).to.not.equal(fakeToken);
      expect(res.body.name).to.equal(u.name);
      expect(res.body.ui.name).to.equal('uiBlob');
      done();
    });
  });

  it('Fail, duplicate bot', (done) => {
    u.createStandard()
    .then(() => {
      api.post(`${path}`)
      .set('Authorization', token)
      .send(u.getStandard())
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type)
        .to.contain('SequelizeUniqueConstraintError');
        done();
      });
    })
    .catch(done);
  });

  it('Fail, bot validation incorrect', (done) => {
    let testBot = u.getStandard();
    testBot.actions = 'INVALID_VALUE';

    api.post(`${path}`)
    .set('Authorization', token)
    .send(testBot)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.contain(tu.valErrorName);
      done();
    });
  });
});
