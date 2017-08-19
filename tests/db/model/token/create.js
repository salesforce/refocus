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

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Profile = tu.db.Profile;
const User = tu.db.User;
const Token = tu.db.Token;
const pfx = '___';

describe('tests/db/model/token/create.js >', () => {
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
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('Create token object', (done) => {
    Token.create({
      name: tokenName,
      createdBy: userObj.id,
    })
    .then((createdToken) => {
      expect(createdToken.name).to.be.equal(tokenName);
      expect(createdToken.isRevoked).to.be.equal('0');
      expect(createdToken.createdBy).to.be.equal(userObj.id);
      done();
    })
    .catch(done);
  });

  it('One user can create multiple tokens, and' +
  'tokens are returned sorted by name in asc order', (done) => {
    Token.create({
      name: 'tokenA',
      createdBy: userObj.id,
    })
    .then(() =>
      Token.create({
        name: 'tokenB',
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
      .catch(done);
      done();
    })
    .catch(done);
  });

  it('Expect error on case-insensitive name/user dupe', (done) => {
    Token.create({
      name: tokenName,
      createdBy: userObj.id,
    })
    .then((createdToken) => Token.create({
      name: createdToken.name.toLowerCase(),
      createdBy: userObj.id,
    }))
    .then(() => done())
    .catch((err) => {
      expect(err).to.have.property('name', 'SequelizeUniqueConstraintError');
      done();
    });
  });
});
