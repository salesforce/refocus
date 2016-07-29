/**
 * tests/api/v1/ssoconfig/utils.js
 */

const tu = require('../../../testUtils');
const jwtUtil = require('../../../../api/v1/helpers/jwtUtil');
const jwt = require('jsonwebtoken');
const samlParams = {
  samlEntryPoint: 'http://someurl.com',
  samlIssuer: 'passport-saml',
};

module.exports = {
  forceDelete(done) {
    return tu.db.SSOConfig.destroy({
      where: {},
      force: true,
    })
    .then(() => done())
    .catch((err) => done(err));
  },

  creatSSOConfig() {
    return tu.db.SSOConfig.create(samlParams);
  },

  createToken() {
    const createdToken = jwtUtil.createToken({ email: 'test@refocus.com' });
    return createdToken;
  },

  samlParams,
};
