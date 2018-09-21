/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/tokenReq/api/token/createtoken.js
 */
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../index').app);
const constants = require('../../api/v1/constants');
const u = require('../testUtils');
const registerPath = '/v1/register';
const tokenPath = '/v1/tokens';

describe('tests/enforceToken/createToken.js, api: createToken >', () => {
  let defaultToken;
  before((done) => {
    api.post(registerPath)
    .send(u.fakeUserCredentials)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      defaultToken = res.body.token;
      done();
    });
  });

  after(u.forceDeleteToken);

  it('error if no token found provided in header', (done) => {
    api.post(tokenPath)
    .send({ name: 'newToken' })
    .expect(constants.httpStatus.FORBIDDEN)
    .expect(/Authentication Failed/)
    .end(done);
  });

  it('error if wrong token found provided', (done) => {
    api.post(tokenPath)
    .set('Authorization', `${defaultToken}xyz`)
    .send({ name: 'newToken' })
    .expect(constants.httpStatus.FORBIDDEN)
    .expect(/Authentication Failed/)
    .end(done);
  });

  it('sucessful authentication, create token for user', (done) => {
    let tok;
    api.post(tokenPath)
    .set('Authorization', defaultToken)
    .send({ name: 'newToken' })
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      tok = res.body;
      expect(tok.name).to.be.equal('newToken');
      expect(new Date(tok.lastUsed)).to.be.instanceof(Date);
      expect(tok.isRevoked).to.be.equal('0');

      // Now use this token to make some other API call...
      api.get(`/v1/users/${u.fakeUserCredentials.username}`)
      .set('Authorization', tok.token)
      .expect(constants.httpStatus.OK)
      .end((err2, res2) => {
        if (err2) {
          return done(err2);
        }

        // And make sure that token's lastUsed attribute got updated
        api.get(`/v1/users/${u.fakeUserCredentials.username}/tokens/${tok.name}`)
        .set('Authorization', defaultToken)
        .expect(constants.httpStatus.OK)
        .end((err3, res3) => {
          if (err3) {
            return done(err3);
          }

          expect(new Date(res3.body.lastUsed))
          .to.be.above(new Date(tok.lastUsed));
          done();
        });
      });
    });
  });
});
