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
const apiErrors = require('../apiErrors');
const Profile = require('../helpers/nouns/profiles').model;

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
    const resultObj = { reqStartTime: req.timestamp };
    configuredPassport.authenticate('local-signup', (err, user) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      if (err) {
        return u.handleError(next, err, resourceName);
      }

      if (!user || !user.name) {
        const loginErr = new apiErrors.LoginError({
          explanation: 'User not created.',
        });
        return u.handleError(next, loginErr, resourceName);
      }

      return req.logIn(user, (_err) => {
        if (_err) {
          return u.handleError(next, _err, resourceName);
        }

        return Profile.isAdmin(user.profileId)
        .then((isAdmin) => { // update in token payload if admin
          const payloadObj = {
            ProfileName: user.profile.name,
            IsAdmin: isAdmin,
          };

          // Create token
          const tokenToReturn = jwtUtil.createToken(
            user.name, user.name, payloadObj
          );
          const userObj = u.responsify(user, helper, req.method);
          userObj.token = tokenToReturn;
          req.session.token = tokenToReturn;
          u.logAPI(req, resultObj, userObj);
          return res.status(httpStatus.CREATED).json(userObj);
        });
      });
    })(req, res, next);
  },
}; // exports
