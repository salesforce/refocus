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

const configuredPassport = require('../../../express').passportModule;
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
   */
  authenticateUser(req, res, next) {
    console.log('authenticateUser', req);
    const resultObj = { reqStartTime: req.timestamp };
    configuredPassport.authenticate('local-login', (err, user/* , info */) => {
      console.log('\n\n\n local login', user);
      console.log('local login error', err);
      if (err) {
        return u.handleError(next, err, resourceName);
      }

      debugger
      if (!user || !user.name) {
        const loginErr = new apiErrors.LoginError({
          explanation: 'Invalid credentials',
        });
        return u.handleError(next, loginErr, resourceName);
      }

      console.log('Before req logIn, req:', user);
      req.logIn(user, (_err) => {
        console.log('\n\n\n\n req logIn inside', user);
        resultObj.dbTime = new Date() - resultObj.reqStartTime;
        if (_err) {
          return u.handleError(next, _err, resourceName);
        }

        console.log('After req.logIn, req.user:', req.user);

        return user.setLastLogin()
          .then(() => Profile.isAdmin(user.profileId))
          .then((isAdmin) => { // update in token payload if admin
            console.log('\n\n\n i am here in user setLastLogin &&&$$$$$$$$$');
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
          })
          .catch((e) => u.handleError(next, e, resourceName));
      });
    })(req, res, next);
  },

}; // exports
