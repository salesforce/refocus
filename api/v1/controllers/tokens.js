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
'use strict';

const helper = require('../helpers/nouns/tokens');
const apiErrors = require('../apiErrors');
const doDelete = require('../helpers/verbs/doDelete');
const doGet = require('../helpers/verbs/doGet');
const jwtUtil = require('../../../utils/jwtUtil');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const resourceName = 'token';
const authUtils = require('../helpers/authUtils');

module.exports = {

  /**
   * DELETE /tokens/{key}
   *
   * Deletes the token metadata record and sends it back in the response. Only
   * permitted for an admin user or the owner of the token being deleted.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteTokenById(req, res, next) {
    authUtils.isAdmin(req)
    .then((ok) => {
      if (ok) {
        doDelete(req, res, next, helper);
      } else {
        // also OK if user is NOT admin but is deleting own token
        let userId;
        authUtils.getUser(req)
        .then((user) => {
          userId = user.id;
          const id = req.swagger.params.key.value;
          return helper.model.findById(id);
        })
        .then((o) => {
          if (o && o.createdBy === userId) {
            doDelete(req, res, next, helper);
          } else {
            u.forbidden(next);
          }
        });
      }
    })
    .catch((err) => {
      u.forbidden(next);
    });
  },

  /**
   * GET /tokens/{key}
   *
   * Retrieves the token metadata record and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getTokenByKey(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * POST /tokens
   *
   * Authenticates user using provided token and creates new token with given
   * name. Saves created token to db and sends token in response with status
   * code 201 if token created, else responds with error.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
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
      createdBy: req.user.id,
    })
    .then((createdToken) => {
      const tokenObj = u.responsify(createdToken, helper, req.method);
      tokenObj.token = tokenValue;
      return res.status(httpStatus.CREATED).json(tokenObj);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * POST /tokens/{key}/restore
   *
   * Restore access for the specified token if access had previously been
   * revoked. Only permitted for an admin user.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  restoreTokenById(req, res, next) {
    authUtils.isAdmin(req)
    .then((ok) => {
      if (ok) {
        const id = req.swagger.params.key.value;
        helper.model.findById(id)
        .then((o) => {
          if (o.isRevoked === '0') {
            throw new apiErrors.InvalidTokenActionError();
          }

          return o.restore();
        })
        .then((o) => {
          const retval = u.responsify(o, helper, req.method);
          res.status(httpStatus.OK).json(retval);
        })
        .catch((err) => u.handleError(next, err, helper.modelName));
      } else {
        u.forbidden(next);
      }
    })
    .catch((err) => {
      u.forbidden(next);
    });
  },

  /**
   * POST /tokens/{key}/revoke
   *
   * Revoke access for the specified token. Only permitted for an admin user.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  revokeTokenById(req, res, next) {
    authUtils.isAdmin(req)
    .then((ok) => {
      if (ok) {
        const id = req.swagger.params.key.value;
        helper.model.findById(id)
        .then((o) => {
          if (o.isRevoked > '0') {
            throw new apiErrors.InvalidTokenActionError();
          }

          return o.revoke();
        })
        .then((o) => {
          const retval = u.responsify(o, helper, req.method);
          res.status(httpStatus.OK).json(retval);
        })
        .catch((err) => u.handleError(next, err, helper.modelName));
      } else {
        u.forbidden(next);
      }
    })
    .catch((err) => {
      u.forbidden(next);
    });
  },
}; // exports
