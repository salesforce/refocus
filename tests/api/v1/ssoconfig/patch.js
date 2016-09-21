/**
 * tests/api/v1/ssoconfig/patch.js
 */

'use strict'; // eslint-disable-line strict

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/ssoconfig';

describe(`api: PATCH ${path}`, () => {
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    u.creatSSOConfig()
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('update samlEntryPoint and verify', (done) => {
    api.patch(path)
    .set('Authorization', token)
    .send({
      samlEntryPoint: 'http://someOtherUrl.com',
      samlIssuer: u.samlParams.samlIssuer,
    })
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.samlEntryPoint).to.not.equal(u.samlParams.samlEntryPoint);
    })
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
