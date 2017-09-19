/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/logout.js
 */

const httpStatus = require('../constants').httpStatus;
const u = require('../helpers/verbs/utils');

const resourceName = 'logout';

module.exports = {

  /**
   * Logs out user if session exists, else sends 401
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   * @returns {Object} JSON object with status
   */
  logoutUser(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    if (req.isAuthenticated()) {
      req.session.destroy((err) => {
        resultObj.dbTime = new Date() - resultObj.reqStartTime;
        if (err) {
          return u.handleError(next, err, resourceName);
        }

        // no resulting data to log
        u.logAPI(req, resultObj);
        return res.status(httpStatus.OK).json({
          success: true,
          message: 'User logged out',
        });
      });
    } else {
      return res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'User already logged out',
      });
    }
  },

}; // exports
