/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/token/find.js
 */

'use strict';  // eslint-disable-line strict

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Token = tu.db.Token;

describe('db: Token: find', () => {
  let tokenObj = {};

  beforeEach((done) => {
    u.createTokenObject()
    .then((createdTokenObj) => {
      tokenObj = createdTokenObj;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);

  it('Find by Id', (done) => {
    Token.findById(tokenObj.id)
    .then((returnedToken) => {
      expect(returnedToken.name).to.be.equal(tokenObj.name);
      expect(returnedToken.id).to.be.equal(tokenObj.id);
      expect(returnedToken.createdBy).to.be.equal(tokenObj.createdBy);
      expect(returnedToken.isDisabled).to.be.equal(tokenObj.isDisabled);
      done();
    })
    .catch((err) => done(err));
  });

  it('Find by createdBy field', (done) => {
    Token.findAll({ where: { createdBy: tokenObj.createdBy } })
    .then((returnedTokens) => {
      expect(returnedTokens.length).to.be.eql(1);
      done();
    })
    .catch((err) => done(err));
  });

  it('token is not returned', (done) => {
    Token.findById(tokenObj.id)
    .then((returnedToken) => {
      expect(returnedToken.token).to.be.eql(undefined);
      done();
    })
    .catch((err) => done(err));
  });
});
