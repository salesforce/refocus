/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/tokens.js
 */
const httpStatus = require('../constants').httpStatus;
const u = require('../helpers/verbs/utils');
const apiErrors = require('../apiErrors');
const jwtUtil = require('../../../utils/jwtUtil');
const helper = require('../helpers/nouns/tokens');

const resourceName = 'tokens';

module.exports = {

  /**
   * Authenticates user using provided token and creates new token with given
   * name. Saves created token to db and sends token in response with status
   * code 201 if token craeted, else responds with error.
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   *
   */
  postToken(req, res, next) {
    // req.user is set when verifying token with user details. If req.user is
    // not set, then return error.
    if (!req.user || !req.user.name) {
      const tokenErr = new apiErrors.LoginError({
        explanation: 'Unable to parse token. Please make sure that you ' +
         'include an Authorization header (i.e. Authorization=YOUR_TOKEN) ' +
         'with your POST request.',
      });
      tokenErr.resource = resourceName;
      return u.handleError(next, tokenErr, resourceName);
    }

    // create token to be returned in response.
    const tokenName = req.swagger.params.queryBody.value.name;
    const tokenValue = jwtUtil.createToken(tokenName, req.user.name);

    // create token object in db
    return helper.model.create({
      name: tokenName,
      createdby: req.user.id,
    })
    .then((createdToken) => {
      const tokenObj = u.responsify(createdToken, helper, req.method);
      tokenObj.token = tokenValue;
      return res.status(httpStatus.CREATED).json(tokenObj);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

}; // exports
