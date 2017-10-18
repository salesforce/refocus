/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/users/delete.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const jwtUtil = require('../../../../utils/jwtUtil');
const u = require('./utils');
const path = '/v1/users';
const expect = require('chai').expect;
const Token = tu.db.Token;
const registerPath = '/v1/register';
const tokenPath = '/v1/tokens';

describe(`tests/api/v1/users/delete.js, DELETE ${path}/:id >`, () => {
  const uname = `${tu.namePrefix}test@refocus.com`;
  const tname = `${tu.namePrefix}Voldemort`;
  let userId;
  let testUserToken = '';

  before((done) => {
    // create user __test@refocus.com
    api.post(registerPath)
    .send({
      email: uname,
      password: 'fakePasswd',
      username: uname,
    })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      userId = res.body.id;
      testUserToken = res.body.token;

      // create token ___Voldemort
      api.post(tokenPath)
      .set('Authorization', testUserToken)
      .send({ name: tname })
      .end(done);
    });
  });

  afterEach(u.forceDelete);

  it('deletion of user does not return default token', (done) => {
    api.delete(`${path}/${uname}`)
    .set('Authorization', testUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('name', uname);
      expect(res.body).to.not.have.property('password');
      expect(res.body.isDeleted).to.not.equal(0);

      Token.findOne({ where: { name: uname, createdBy: userId } })
      .then((tobj) => {
        if (tobj) {
          return done(new Error('Default token should have been deleted'));
        }

        done();
      })
      .catch(done);
    });
  });
});
