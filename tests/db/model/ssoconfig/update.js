/**
 * tests/db/model/ssoconfig/update.js
 */

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const SSOConfig = tu.db.SSOConfig;

describe('db: ssoconfig: update: ', () => {
  beforeEach((done) => {
    u.creatSSOConfig()
    .then(() => done())
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);

  it('simple', (done) => {
    SSOConfig.findOne()
    .then((o) => o.update({ samlIssuer: 'passport-saml123' }))
    .then(() => SSOConfig.findOne())
    .then((o) => {
      expect(o.samlIssuer).to.equal('passport-saml123');
      done();
    })
    .catch((err) => done(err));
  });
});
