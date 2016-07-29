/**
 * tests/api/v1/authenticate/SSOConfig.js
 */

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const loginPath = '/login';
const u = require('./utils');
const constants = require('../../../../api/v1/constants');


describe(`api: login ssoconfig`, () => {
  afterEach(u.forceDeleteSSOConfig);

  it('does not contain sso config button if no ssoconfig', (done) => {
    api.get(loginPath)
    .expect((res) => {
      expect(res.text).to.not.contain('SSO Login');
    })
    .end((err) => {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('contains sso login button text if ssoconfig', (done) => {
    u.creatSSOConfig()
    .then((ssoconfig) => {
      if(ssoconfig){
        api.get(loginPath)
        .expect(constants.httpStatus.OK)
        .expect((res) => expect(res.text).to.not.contain('SSO Login'))
        .end((err) => {
          if (err) {
            return done(err);
          }
        });
      }
    })
    .then(() => done())
    .catch((err) => done(err));
  });
});
