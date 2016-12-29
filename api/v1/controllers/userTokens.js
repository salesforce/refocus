/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/userTokens.js
 */
'use strict';

const helper = require('../helpers/nouns/tokens');
const apiErrors = require('../apiErrors');
const cnstnts = require('../constants');
const u = require('../helpers/verbs/utils');
const httpStatus = cnstnts.httpStatus;

function whereClauseForUser(user) {
  const whr = {};
  whr[cnstnts.SEQ_OR] = [
    {
      'user.name': {},
    },
    {
      'user.id': {},
    },
  ];
  whr[cnstnts.SEQ_OR][0]['user.name'][cnstnts.SEQ_LIKE] = user;
  whr[cnstnts.SEQ_OR][1]['user.id'][cnstnts.SEQ_LIKE] = user;
  return whr;
} // whereClauseForUser

function whereClauseForUserAndTokenName(user, tokenName) {
  const whr = whereClauseForUser(user);
  whr.name = {};
  whr.name[cnstnts.SEQ_LIKE] = tokenName;
  return whr;
} // whereClauseForUserAndTokenName

module.exports = {

  /**
   * DELETE /users/{key}/tokens/{tokenName}
   *
   * Deletes the token metadata record and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteUserToken(req, res, next) {
    const user = req.swagger.params.key.value;
    const tokenName = req.swagger.params.tokenName.value;
    const whr = whereClauseForUserAndTokenName(user, tokenName);
    helper.model.findOne(whr)
    .then((o) => {
      if (o) {
        return o.destroy();
      }

      const err = new apiErrors.ResourceNotFoundError();
      err.resource = helper.model.name;
      err.key = user + ', ' + tokenName;
      throw err;
    })
    .then((o) => res.status(httpStatus.OK)
      .json(u.responsify(o, helper, req.method)))
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * GET /users/{key}/tokens/{tokenName}
   *
   * Retrieves the token metadata record and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getUserToken(req, res, next) {
    const user = req.swagger.params.key.value;
    const tokenName = req.swagger.params.tokenName.value;
    const whr = whereClauseForUserAndTokenName(user, tokenName);
    helper.model.findOne(whr)
    .then((o) => {
      res.status(httpStatus.OK).json(u.responsify(o, helper, req.method));
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * GET /users/{key}/tokens
   *
   * Gets zero or more tokens for the specified user and sends them back in the
   * response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getUserTokens(req, res, next) {
    const user = req.swagger.params.key.value;
    const whr = whereClauseForUser(user);
    helper.model.findAll(whr)
    .then((o) => {
      res.set(cnstnts.COUNT_HEADER_NAME, o.length);
      const retval = o.map((row) => u.responsify(row, helper, req.method));
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * POST /users/{key}tokens/{tokenName}/restore
   *
   * Restore access for the specified token if access had previously been
   * revoked.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  restoreTokenByName(req, res, next) {
    const user = req.swagger.params.key.value;
    const tokenName = req.swagger.params.tokenName.value;
    const whr = whereClauseForUserAndTokenName(user, tokenName);
    helper.model.findOne(whr)
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
  },

  /**
   * POST /users/{key}tokens/{tokenName}/revoke
   *
   * Revoke access for the specified token.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  revokeTokenByName(req, res, next) {
    const user = req.swagger.params.key.value;
    const tokenName = req.swagger.params.tokenName.value;
    const whr = whereClauseForUserAndTokenName(user, tokenName);
    helper.model.findOne(whr)
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
  },
}; // exports
