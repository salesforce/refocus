/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/enforceToken/revoke.js
 */
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../index').app);
const constants = require('../../api/v1/constants');
const u = require('../testUtils');
const registerPath = '/v1/register';
const tokenPath = '/v1/tokens';

describe('tests/enforceToken/revoke.js, enforceToken: revoke >', () => {
  let defaultToken;
  const predefinedAdminUserToken = u.createAdminToken();

  beforeEach((done) => {
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

  afterEach(u.forceDeleteToken);

  it('cannot use revoked token to authorize any API calls', (done) => {
    api.post(tokenPath)
    .set('Authorization', defaultToken)
    .send({ name: 'newToken' })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const newToken = res.body.token;
      return api.post(`${tokenPath}/${res.body.id}/revoke`)
      .set('Authorization', predefinedAdminUserToken)
      .send({ })
      .end((err2, res2) => {
        if (err2 || res2.body.errors) {
          return done(err2);
        }

        return api.get('/v1/subjects')
        .set('Authorization', newToken)
        .expect(constants.httpStatus.FORBIDDEN)
        .end((err3, res3) => {
          if (err3) {
            return done(err3);
          }

          expect(res3.body.errors[0].description)
          .to.eql('Token was revoked. Please contact your Refocus ' +
            'administrator.');
          return done();
        });
      });
    });
  });

  it('restored token works to authorize an API call', (done) => {
    api.post(tokenPath)
    .set('Authorization', defaultToken)
    .send({ name: 'newToken' })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const newToken = res.body.token;
      const tid = res.body.id;
      return api.post(`${tokenPath}/${tid}/revoke`)
      .set('Authorization', predefinedAdminUserToken)
      .send({ })
      .end((err2, res2) => {
        expect(res2.body).to.not.have.property('errors');
        if (err2 || res2.body.errors) {
          return done(err2);
        }

        return api.post(`${tokenPath}/${tid}/restore`)
        .set('Authorization', predefinedAdminUserToken)
        .send({ })
        .end((err3, res3) => {
          expect(res3.body).to.have.property('isRevoked', '0');
          expect(res3.body).to.have.property('name', 'newToken');
          if (err3 || res3.body.errors) {
            return done(err3);
          }

          return api.get('/v1/subjects')
          .set('Authorization', newToken)
          .expect(constants.httpStatus.OK)
          .end((err4, res4) => {
            if (err4 || res4.body.errors) {
              return done(err4);
            }

            return done();
          });
        });
      });
    });
  });
});
