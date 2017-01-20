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

const sinon = require('sinon');
const DUMMY_STR = 'COOL_NAME';
const expect = require('chai').expect;
const jwtUtil = require('../../utils/jwtUtil');
const tu = require('../testUtils');

describe('jwtUtil getTokenDetailsFromToken test', (done) => {
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

  it('works with valid Authorization from cookie', () => {
    const cookies = {
      Authorization: token,
    };

    jwtUtil.getTokenDetailsFromToken(cookies).then((res) => {
      expect(res.tokenname).to.be.defined;
      expect(res.usernname).to.be.defined;
      done();
    })
    .catch(done);
  });

  it('works with valid Authorization from request header', () => {
    const req = {
      headers: {
        authorization: token,
      }
    };

    jwtUtil.getTokenDetailsFromToken(req).then((res) => {
      expect(res.tokenname).to.be.defined;
      expect(res.usernname).to.be.defined;
      done();
    })
    .catch(done);
  });

  // if a timeout occurs here, print out error
  it('fails with invalid format', (done) => {
    const req = { authorization: DUMMY_STR };
    jwtUtil.getTokenDetailsFromToken(req).then((res) =>
      done(new Error('expected error here')))
    .catch((err) => {
      expect(err.status).to.equal(FORBIDDEN);
      done();
    });
  });

  // if a timeout occurs here, print out error
  it('fails with undefined input', (done) => {
    jwtUtil.getTokenDetailsFromToken().then((res) =>
      done(new Error('expected error here')))
    .catch((err) => {
      expect(err.status).to.equal(FORBIDDEN);
      done();
    });
  });
});
