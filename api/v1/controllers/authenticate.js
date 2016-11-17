/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/authenticate.js
 */

const configuredPassport = require('../../../index').passportModule;
const httpStatus = require('../constants').httpStatus;
const u = require('../helpers/verbs/utils');
const apiErrors = require('../apiErrors');
const jwtUtil = require('../../../utils/jwtUtil');

const resourceName = 'authenticate';

module.exports = {

  /**
   * Authenticates user and sends response with status code 200 if authenticated
   * else responds with error.
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   *
   */
  authenticateUser(req, res, next) {
    configuredPassport.authenticate('local-login', (err, user/* , info */) => {
      if (err) {
        return u.handleError(next, err, resourceName);
      }

      if (!user) {
        const loginErr = new apiErrors.LoginError({
          explanation: 'Invalid credentials',
        });
        return u.handleError(next, loginErr, resourceName);
      }

      // Create a new token on login.
      const createdToken = jwtUtil.createToken(user);

      req.logIn(user, (_err) => {
        if (_err) {
          return u.handleError(next, _err, resourceName);
        }

        return res.status(httpStatus.OK).json({
          success: true,
          message: 'authentication succeeded',
          token: createdToken,
        });
      });
    })(req, res, next);
  },

}; // exports
