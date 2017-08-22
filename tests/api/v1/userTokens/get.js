/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/userTokens/get.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/users';
const expect = require('chai').expect;
const regPath = '/v1/register';
const tokenPath = '/v1/tokens';

describe('tests/api/v1/userTokens/get.js, ' +
`GET ${path}/U/tokens >`, () => {
  /* user uname has 2 tokens: Voldemort and Tom
   user with unameOther has 1 token: Dumbledore */
  const uname = `${tu.namePrefix}test@refocus.com`;
  const unameOther = `${tu.namePrefix}testOther@refocus.com`;
  const tname1 = `${tu.namePrefix}Voldemort`;
  const tname2 = `${tu.namePrefix}Tom`;
  const tnameOther = `${tu.namePrefix}Dumbledore`;
  let userId;
  let unameToken;

  before((done) => {
    // create user __test@refocus.com
    api.post(regPath)
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
      unameToken = res.body.token;

      // create token ___Voldemort
      api.post(tokenPath)
      .set('Authorization', res.body.token)
      .send({ name: tname1 })
      .end((err1, res1) => {
        if (err1) {
          return done(err1);
        }

        // create token ___Tom
        api.post(tokenPath)
        .set('Authorization', res.body.token)
        .send({ name: tname2 })
        .end((err2, res2) => {
          if (err2) {
            return done(err2);
          }

          // create user __testOther@refocus.com
          api.post(regPath)
          .send({
            email: unameOther,
            password: 'fakePasswd',
            username: unameOther,
          })
          .end((err3, res3) => {
            if (err3) {
              return done(err3);
            }

            // create token ___Tom
            api.post(tokenPath)
            .set('Authorization', res3.body.token)
            .send({ name: tnameOther })
            .end((err4, res4) => {
              if (err4) {
                return done(err4);
              }

              done();
            });
          });
        });
      });
    });
  });

  after(u.forceDelete);

  it('user by name and token found', (done) => {
    api.get(`${path}/${uname}/tokens/${tname1}`)
    .set('Authorization', unameToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('name', tname1);
      expect(res.body.isDeleted).to.not.equal(0);
      done();
    });
  });

  it('user by Id and token found', (done) => {
    api.get(`${path}/${userId}/tokens/${tname1}`)
    .set('Authorization', unameToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('name', tname1);
      expect(res.body.isDeleted).to.not.equal(0);
      done();
    });
  });

  it('user not found, one token', (done) => {
    api.get(`${path}/who@what.com/tokens/foo`)
    .set('Authorization', unameToken)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.be.equal('ResourceNotFoundError');
      done();
    });
  });

  it('user not found, all tokens', (done) => {
    api.get(`${path}/who@what.com/tokens`)
    .set('Authorization', unameToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.length(0);
      done();
    });
  });

  it('user found but token name not found', (done) => {
    api.get(`${path}/${uname}/tokens/foo`)
    .set('Authorization', unameToken)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.be.equal('ResourceNotFoundError');
      done();
    });
  });

  it('user found, token found, but token of different user', (done) => {
    api.get(`${path}/${uname}/tokens/${tnameOther}`)
    .set('Authorization', unameToken)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.be.equal('ResourceNotFoundError');
      done();
    });
  });

  it('user, get all tokens', (done) => {
    api.get(`${path}/${uname}/tokens`)
    .set('Authorization', unameToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(2);
      expect(res.body[0].User).to.have.property('name', uname);
      expect(res.body[1].User).to.have.property('name', uname);
      done();
    });
  });
});
