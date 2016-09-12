/**
 * tests/api/v1/ssoconfig/delete.js
 */

'use strict'; // eslint-disable-line strict

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/ssoconfig';

describe(`api: DELETE ${path}`, () => {
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

  it('delete ok', (done) => {
    api.delete(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.samlEntryPoint).to.equal(u.samlParams.samlEntryPoint);
      expect(res.body.isDeleted).to.not.equal(0);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
