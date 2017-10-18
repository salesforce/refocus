/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/logging/jwtUtil.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const jwtUtil = require('../../utils/jwtUtil');
const tu = require('../testUtils');

describe('tests/logging/jwtUtil.js, jwtUtil getTokenDetailsFromTokenString ' +
'test >', (done) => {
  // setup
  let token;
  const FORBIDDEN = 403;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  after(tu.forceDeleteUser);

  it('works with valid token', (done) => {
    jwtUtil.getTokenDetailsFromTokenString(token).then((res) => {
      expect(res.tokenname).to.equal(tu.userName);
      expect(res.username).to.equal(tu.userName);
      done();
    })
    .catch(done);
  });

  // if a timeout occurs here, print out error
  it('fails with invalid format', (done) => {
    const INVALID_TOKEN = token.split('').reverse().join('');
    jwtUtil.getTokenDetailsFromTokenString(INVALID_TOKEN).then((res) =>
      done(new Error('expected error here')))
    .catch((err) => {
      expect(err.status).to.equal(FORBIDDEN);
      done();
    });
  });

  // if a timeout occurs here, print out error
  it('fails with undefined input', (done) => {
    jwtUtil.getTokenDetailsFromTokenString().then((res) =>
      done(new Error('expected error here')))
    .catch((err) => {
      expect(err.status).to.equal(FORBIDDEN);
      done();
    });
  });
});
