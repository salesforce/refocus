/**
 * tests/api/v1/ssoconfig/get.js
 */
'use strict'; // eslint-disable-line strict

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/ssoconfig';


describe(`api: GET ${path}`, () => {
  const token = tu.createToken();

  before((done) => {
    u.creatSSOConfig()
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('get ok', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.samlEntryPoint).to.equal(u.samlParams.samlEntryPoint);
    })
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
