/**
 * api/v1/controllers/apiaccess.js
 */

const configuredPassport = require('../../../index').passportModule;
const httpStatus = require('../constants').httpStatus;
const u = require('../helpers/verbs/utils');
const apiErrors = require('../apiErrors');
const jwtUtil = require('../helpers/jwtUtil');

const resourceName = 'token';

module.exports = {

  /**
   * Authenticates user and sends token in response with status code 200
   * if authenticated else responds with error.
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   *
   */
  postToken(req, res, next) {
    configuredPassport.authenticate('local-login', (err, user/* , info */) => {
      if (err) {
        return u.handleError(next, err, resourceName);
      }

      if (!user) {
        const loginErr = new apiErrors.LoginError();
        loginErr.resource = resourceName;
        loginErr.info = 'Invalid credentials.';
        return u.handleError(next, loginErr, resourceName);
      }

      const createdToken = jwtUtil.createToken(user);

      return res.status(httpStatus.OK).json({
        success: true,
        message: 'Enjoy your token!',
        token: createdToken,
      });
    })(req, res, next);
  },

}; // exports
