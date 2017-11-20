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
const Profile = require('../helpers/nouns/profiles').model;

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
    const resultObj = { reqStartTime: req.timestamp };
    configuredPassport.authenticate('local-login', (err, user/* , info */) => {
      if (err) {
        return u.handleError(next, err, resourceName);
      }

      if (!user || !user.name) {
        const loginErr = new apiErrors.LoginError({
          explanation: 'Invalid credentials',
        });
        return u.handleError(next, loginErr, resourceName);
      }

      req.logIn(user, (_err) => {
        resultObj.dbTime = new Date() - resultObj.reqStartTime;
        if (_err) {
          return u.handleError(next, _err, resourceName);
        }

        return Profile.isAdmin(user.profileId)
        .then((isAdmin) => { // update in token payload if admin
          const payloadObj = {
            ProfileName: user.profile.name,
            IsAdmin: isAdmin,
          };

          // create token
          const token = jwtUtil.createToken(
            req.user.name, req.user.name, payloadObj
          );

          req.session.token = token;
          const retObj = {
            success: true,
            message: 'authentication succeeded',
          };
          u.logAPI(req, resultObj, retObj);
          return res.status(httpStatus.OK).json(retObj);
        });
      });
    })(req, res, next);
  },

}; // exports
