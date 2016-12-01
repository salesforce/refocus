/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/tokenReq/api/tokens/createtoken.js
 */

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const registerPath = '/v1/register';
const tokenPath = '/v1/tokens';

describe('api: createToken', () => {
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

  after(u.forceDelete);

  it('error if no token found provided in header', (done) => {
    api.post(tokenPath)
    .send({ name: 'newToken' })
    .expect(constants.httpStatus.FORBIDDEN)
    .expect(/No authorization token was found/)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('error if wrong token found provided', (done) => {
    api.post(tokenPath)
    .set('Authorization', `${defaultToken}xyz`)
    .send({ name: 'newToken' })
    .expect(constants.httpStatus.FORBIDDEN)
    .expect(/Invalid Token/)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('sucessful authentication, create token for user', (done) => {
    api.post(tokenPath)
    .set('Authorization', defaultToken)
    .send({ name: 'newToken' })
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.be.equal('newToken');
      expect(res.body.isRevoked).to.be.equal('0');
      done();
    });
  });
});