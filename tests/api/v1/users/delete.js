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
const u = require('./utils');
const path = '/v1/users';
const expect = require('chai').expect;
const Token = tu.db.Token;
const registerPath = '/v1/register';
const tokenPath = '/v1/tokens';

describe(`api: DELETE ${path}/:id`, () => {
  const uname = `${tu.namePrefix}test@refocus.com`;
  const tname = `${tu.namePrefix}Voldemort`;
  let userId;

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
        done(err);
      }

      userId = res.body.id;

      // create token ___Voldemort
      api.post(tokenPath)
      .set('Authorization', res.body.token)
      .send({ name: tname })
      .end((err1, res1) => {
        if (err1) {
          done(err1);
        }

        done();
      });
    });
  });

  afterEach(u.forceDelete);

  it('deletion of user does not return default token', (done) => {
    api.delete(`${path}/${uname}`)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body).to.have.property('name', uname);
        expect(res.body).to.not.have.property('password');
        expect(res.body.isDeleted).to.not.equal(0);

        Token.findOne({ where: { name: uname, createdBy: userId } })
        .then((tobj) => {
          if (tobj) {
            done(new Error('Default token should have been deleted'));
          }

          done();
        })
        .catch((err1) => done(err1));
      }
    });
  });
});
