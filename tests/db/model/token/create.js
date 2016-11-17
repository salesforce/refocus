/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/token/create.js
 */

'use strict';  // eslint-disable-line strict

const bcrypt = require('bcrypt-nodejs');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Profile = tu.db.Profile;
const User = tu.db.User;
const Token = tu.db.Token;
const pfx = '___';
const jwtUtil = require('../../../../utils/jwtUtil');

describe('db: Token: create', () => {
  let userObj = {};
  const tokenName = 'testTokenName';

  beforeEach((done) => {
    Profile.create({
      name: `${pfx}testProfile`,
    })
    .then((createdProfile) =>
      User.create({
        profileId: createdProfile.id,
        name: `${pfx}test@refocus.com`,
        email: `${pfx}test@refocus.com`,
        password: 'user123password',
      })
    )
    .then((returnedUser) => {
      userObj = returnedUser;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);

  it('Create token object', (done) => {
    // create token
    const token = jwtUtil.createToken({
      name: userObj.name,
      email: userObj.name,
    });

    Token.create({
      name: tokenName,
      token,
      createdBy: userObj.id,
    })
    .then((createdToken) => {
      expect(createdToken.name).to.be.equal(tokenName);
      bcrypt.compare(token, createdToken.token, (err, res) => {
        if (err) {
          throw err;
        }

        expect(res).to.be.true;  // eslint-disable-line no-unused-expressions
      });
      expect(createdToken.isDisabled).to.be.equal('0');
      expect(createdToken.createdBy).to.be.equal(userObj.id);
      done();
    })
    .catch((err) => done(err));
  });

  it('One user can create multiple tokens, and' +
  'tokens are returned sorted by name in asc order', (done) => {
    // create tokens
    const tokenA = jwtUtil.createToken({
      name: 'tokenA',
      username: userObj.name,
      email: userObj.name,
    });

    const tokenB = jwtUtil.createToken({
      name: 'tokenB',
      username: userObj.name,
      email: userObj.name,
    });

    Token.create({
      name: 'tokenA',
      token: tokenA,
      createdBy: userObj.id,
    })
    .then(() =>
      Token.create({
        name: 'tokenB',
        token: tokenB,
        createdBy: userObj.id,
      })
    )
    .then(() => {
      Token.findAll({ where: { createdBy: userObj.id } })
      .then((returnedTokens) => {
        expect(returnedTokens.length).to.be.equal(2);
        expect(returnedTokens[0].name).to.be.equal('tokenA');
        expect(returnedTokens[0].createdBy).to.be.equal(userObj.id);
        expect(returnedTokens[1].name).to.be.equal('tokenB');
        expect(returnedTokens[1].createdBy).to.be.equal(userObj.id);
      })
      .catch((err) => done(err));
      done();
    })
    .catch((err) => done(err));
  });
});
