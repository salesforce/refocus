/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/register.js
 */

const configuredPassport = require('../../../index').passportModule;
const httpStatus = require('../constants').httpStatus;
const u = require('../helpers/verbs/utils');
const helper = require('../helpers/nouns/users');
const jwtUtil = require('../../../utils/jwtUtil');

const resourceName = 'register';

module.exports = {

  /**
   * Registers a new user and sends it back in response with status code 201.
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   *
   */
  registerUser(req, res, next) {
    configuredPassport.authenticate('local-signup', (err, user) => {
      if (err) {
        u.handleError(next, err, resourceName);
      } else {
        req.logIn(user, (_err) => {
          if (_err) {
            return u.handleError(next, _err, resourceName);
          }

          // Create a new token on login.
          const createdToken = jwtUtil.createToken(user);

          const userObj = u.responsify(user, helper, req.method);
          userObj.token = createdToken;
          return res.status(httpStatus.CREATED).json(userObj);
        });
      }
    })(req, res, next);
  },

}; // exports
