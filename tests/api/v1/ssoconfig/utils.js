/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/ssoconfig/utils.js
 */
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const tu = require('../../../testUtils');
const samlParams = {
  samlEntryPoint: 'http://someurl.com',
  samlIssuer: 'passport-saml',
};
const uname = `${tu.namePrefix}test@test.com`;

module.exports = {
  forceDelete() {
    return tu.db.SSOConfig.destroy({
      where: {},
      force: true,
    });
  },

  createSSOConfig() {
    return tu.db.SSOConfig.create(samlParams);
  },

  /**
   * Returns token for a generic (non-admin) user.
   *
   * @param {String} token - the token from a user with permission to create
   *  new users
   * @param {Function} next - a callback function with two args: first arg is
   *  the error, if any; second arg is the token for the new generic user.
   */
  newGenericUser(token, next) {
    api.post('/v1/register')
    .set('Authorization', token)
    .send({
      username: uname,
      email: uname,
      password: 'abcdefghijklmnopqrstuvwxyz',
    })
    .end((err, res) => {
      next(err, res.body.token);
    });
  },

  samlParams,
};
