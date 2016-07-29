/**
 * tests/api/v1/authenticate/loginSaml.js
 */

'use strict'; // eslint-disable-line strict

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const samlPath = '/loginSAML';
const u = require('./utils');


describe(`api: passport saml`, () => {
  let ssoconfig;
  before((done) => {
    u.creatSSOConfig()
    .then((createdconfig) => {
      ssoconfig = createdconfig;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDeleteSSOConfig);

  it('redirects to saml IDP', (done) => {
    api.get('/login')
    .expect(() => {
      api.get(samlPath)
      .expect((res) => expect(res.redirect).to.be.true)
      .expect((res) => {
        expect(res.header.location).to.contain(ssoconfig.samlEntryPoint);
      });
    })
    .end((err) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });
});

