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
const Profile = tu.db.Profile;
const User = tu.db.User;
const Token = tu.db.Token;

describe(`api: GET ${path}/U/tokens/T`, () => {
  /* user uname has 2 tokens: Voldemort and Tom
   user with unameOther has 1 token: Dumbledore */
  const uname = `${tu.namePrefix}test@refocus.com`;
  const unameOther = `${tu.namePrefix}testOther@refocus.com`;
  const tname1 = `${tu.namePrefix}Voldemort`;
  const tname2 = `${tu.namePrefix}Tom`;
  const tnameOther = `${tu.namePrefix}Dumbledore`;
  let profileId;
  let userId;

  before((done) => {
    Profile.create({
      name: `${tu.namePrefix}testProfile`,
    })
    .then((profile) => {
      profileId = profile.id;
      return User.create({
        profileId: profile.id,
        name: uname,
        email: uname,
        password: 'user123password',
      });
    })
    .then((user) => {
      userId = user.id;
      return Token.create({
        name: tname1,
        createdBy: user.id,
      });
    })
    .then(() => Token.create({
      name: tname2,
      createdBy: userId,
    }))
    .then(() =>
      User.create({
        profileId: profileId,
        name: unameOther,
        email: unameOther,
        password: 'user123password',
      })
    )
    .then((user) => Token.create({
      name: tnameOther,
      createdBy: user.id,
    }))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('user and token found', (done) => {
    api.get(`${path}/${uname}/tokens/${tname1}`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body).to.have.property('name', tname1);
        expect(res.body.isDeleted).to.not.equal(0);
        done();
      }
    });
  });

  it('user not found, one token', (done) => {
    api.get(`${path}/who@what.com/tokens/foo`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        throw err;
      }

      expect(res.body.errors[0].type).to.be.equal('ResourceNotFoundError');
      done();
    });
  });

  it('user not found, all tokens', (done) => {
    api.get(`${path}/who@what.com/tokens`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        throw err;
      }

      expect(res.body).to.length(0);
      done();
    });
  });

  it('user found but token name not found', (done) => {
    api.get(`${path}/${uname}/tokens/foo`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        throw err;
      }

      expect(res.body.errors[0].type).to.be.equal('ResourceNotFoundError');
      done();
    });
  });

  it('user found, token found, but token of different user', (done) => {
    api.get(`${path}/${uname}/tokens/${tnameOther}`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        throw err;
      }

      expect(res.body.errors[0].type).to.be.equal('ResourceNotFoundError');
      done();
    });
  });

  it('user, get all tokens', (done) => {
    api.get(`${path}/${uname}/tokens`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body).to.have.length(2);
        expect(res.body[0]).to.have.property('name', tname2);
        expect(res.body[1]).to.have.property('name', tname1);
        expect(res.body.isDeleted).to.not.equal(0);
        done();
      }
    });
  });
});
