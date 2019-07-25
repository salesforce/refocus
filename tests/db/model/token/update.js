/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/token/update.js
 */
'use strict';  // eslint-disable-line strict

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Token = tu.db.Token;

describe('tests/db/model/token/update.js >', () => {
  let tokenObj = {};

  beforeEach((done) => {
    u.createTokenObject()
    .then((createdTokenObj) => {
      tokenObj = createdTokenObj;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('Update token object name', (done) => {
    Token.findByPk(tokenObj.id)
    .then((returnedToken) => returnedToken.update({ name: 'newTokenName' }))
    .then((updatedToken) => {
      expect(updatedToken.name).to.be.equal('newTokenName');
      done();
    })
    .catch(done);
  });

  it('Revoke a token', (done) => {
    const date = Date.now();
    Token.findByPk(tokenObj.id)
    .then((returnedToken) => returnedToken.update({ isRevoked: date }))
    .then((updatedToken) => {
      expect(updatedToken.isRevoked).to.be.eql(date);
      done();
    })
    .catch(done);
  });

  it('setLastUsed', (done) => {
    let orig;
    let ts = new Date();
    Token.findByPk(tokenObj.id)
    .then((returnedToken) => {
      orig = returnedToken.lastUsed;
      return returnedToken.setLastUsed(ts);
    })
    .then(() => Token.findByPk(tokenObj.id))
    .then((returnedToken) => {
      expect(returnedToken.lastUsed).to.be.greaterThan(orig);
      expect(returnedToken.lastUsed).to.be.instanceof(Date);
      expect(ts).to.be.instanceof(Date);
      expect(returnedToken.lastUsed.getTime()).to.equal(ts.getTime());
      done();
    })
    .catch(done);
  });
});
