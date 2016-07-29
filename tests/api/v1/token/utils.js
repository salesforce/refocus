/**
 * tests/api/v1/token/utils.js
 */

const tu = require('../../../testUtils');

const testStartTime = new Date();

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
};
