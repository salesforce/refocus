/**
 * tests/api/v1/authenticate/utils.js
 */

const tu = require('../../../testUtils');

const testStartTime = new Date();
const samlParams = {
  samlEntryPoint: 'http://someurl.com',
  samlIssuer: 'passport-saml',
};

module.exports = {
  fakeUserCredentials: {
    email: 'user1@abc.com',
    password: 'fakePasswd',
  },
  forceDelete(done) {
    tu.forceDelete(tu.db.User, testStartTime)
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },
  creatSSOConfig() {
    return tu.db.SSOConfig.create(samlParams);
  },
  forceDeleteSSOConfig(done) {
    return tu.db.SSOConfig.destroy({
      where: {},
      force: true,
    })
    .then(() => done())
    .catch((err) => done(err));
  },
};
