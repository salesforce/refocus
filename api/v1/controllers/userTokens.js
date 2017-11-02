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
'use strict'; // eslint-disable-line strict

const helper = require('../helpers/nouns/tokens');
const apiErrors = require('../apiErrors');
const cnstnts = require('../constants');
const u = require('../helpers/verbs/utils');
const httpStatus = cnstnts.httpStatus;

/**
 * where clause to get user tokens
 * @param  {String} userNameOrId - User name or id
 * @returns {Object} - where clause
 */
function whereClauseForUser(userNameOrId) {
  const whr = {};
  if (u.looksLikeId(userNameOrId)) {
    /*
     * need to use '$table.field$' for association fields. User IDs in the url
     * are case-sensitve.
     */
    whr.where = { '$User.id$': {} };
    whr.where['$User.id$'] = userNameOrId;
  } else {
    whr.where = { '$User.name$': {} };
    whr.where['$User.name$'][cnstnts.SEQ_LIKE] = userNameOrId;
  }

  return whr;
} // whereClauseForUser

/**
 * where clause to get a token for a user
 * @param  {String} user - User name or id
 * @param  {Str} tokenName - Token name
 * @returns {Object} - where clause
 */
function whereClauseForUserAndTokenName(user, tokenName) {
  const whr = whereClauseForUser(user);
  whr.where.name = {};
  whr.where.name[cnstnts.SEQ_LIKE] = tokenName;
  return whr;
} // whereClauseForUserAndTokenName

module.exports = {

  /**
   * DELETE /users/{key}/tokens/{tokenName}
   *
   * Deletes the token metadata record and sends it back in the response. Only
   * permitted for an admin user or the owner of the token being deleted.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteUserToken(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    const user = req.swagger.params.key.value;
    const tokenName = req.swagger.params.tokenName.value;
    const whr = whereClauseForUserAndTokenName(user, tokenName);

    // get user token
    helper.model.findOne(whr)
    .then((token) => {
      // if no token found, return error
      if (!token) {
        const err = new apiErrors.ResourceNotFoundError();
        err.resource = helper.model.name;
        err.key = user + ', ' + tokenName;
        throw err;
      }

      // Default token cannot be deleted
      if (token.name === token.User.name) {
        throw new apiErrors.ForbiddenError({
          explanation: 'Forbidden.',
        });
      }

      /*
       * Ok to destroy the token if the request is made by an admin user or
       * if an non admin user wants to revoke their own token
       */
      if (req.headers.IsAdmin || token.createdBy === req.user.id) {
        return token.destroy();
      }

      // else forbidden
      throw new apiErrors.ForbiddenError({
        explanation: 'Forbidden.',
      });
    })
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      u.logAPI(req, resultObj, o.dataValues);
      if (o) {
        // object deleted successfully
        res.status(httpStatus.OK)
        .json(u.responsify(o, helper, req.method));
      } else if (o instanceof Error) {
        // forbidden err
        throw o;
      }
    })
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
    const resultObj = { reqStartTime: req.timestamp };
    const user = req.swagger.params.key.value;
    const tokenName = req.swagger.params.tokenName.value;
    const whr = whereClauseForUserAndTokenName(user, tokenName);
    helper.model.findOne(whr)
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      if (!o) {
        const err = new apiErrors.ResourceNotFoundError();
        err.resource = helper.model.name;
        err.key = user + ', ' + tokenName;
        throw err;
      }

      u.logAPI(req, resultObj, o.dataValues);
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
    const resultObj = { reqStartTime: req.timestamp };
    const user = req.swagger.params.key.value;
    const whr = whereClauseForUser(user);
    helper.model.findAll(whr)
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      res.set(cnstnts.COUNT_HEADER_NAME, o.length);
      const retval = o.map((row) => u.responsify(row, helper, req.method));
      u.logAPI(req, resultObj, retval);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * POST /users/{key}tokens/{tokenName}/restore
   *
   * Restore access for the specified token if access had previously been
   * revoked. Only permitted for an admin user.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  restoreTokenByName(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    if (req.headers.IsAdmin) {
      const user = req.swagger.params.key.value;
      const tokenName = req.swagger.params.tokenName.value;
      const whr = whereClauseForUserAndTokenName(user, tokenName);
      helper.model.findOne(whr)
      .then((o) => {
        if (!o) {
          const err = new apiErrors.ResourceNotFoundError();
          err.resource = helper.model.name;
          err.key = user + ', ' + tokenName;
          throw err;
        }

        if (o.isRevoked === '0') {
          throw new apiErrors.InvalidTokenActionError();
        }

        return o.restore();
      })
      .then((o) => {
        resultObj.dbTime = new Date() - resultObj.reqStartTime;
        const retval = u.responsify(o, helper, req.method);
        res.status(httpStatus.OK).json(retval);
        u.logAPI(req, resultObj, retval);
      })
      .catch((err) => u.handleError(next, err, helper.modelName));
    } else {
      u.forbidden(next);
    }
  },

  /**
   * POST /users/{key}tokens/{tokenName}/revoke
   *
   * Revoke access for the specified token. Only permitted for an admin user.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  revokeTokenByName(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    if (req.headers.IsAdmin) {
      const user = req.swagger.params.key.value;
      const tokenName = req.swagger.params.tokenName.value;
      const whr = whereClauseForUserAndTokenName(user, tokenName);
      helper.model.findOne(whr)
      .then((o) => {
        if (!o) {
          const err = new apiErrors.ResourceNotFoundError();
          err.resource = helper.model.name;
          err.key = user + ', ' + tokenName;
          throw err;
        }

        if (o.isRevoked > '0') {
          throw new apiErrors.InvalidTokenActionError();
        }

        return o.revoke();
      })
      .then((o) => {
        resultObj.dbTime = new Date() - resultObj.reqStartTime;
        const retval = u.responsify(o, helper, req.method);
        u.logAPI(req, resultObj, retval);
        res.status(httpStatus.OK).json(retval);
      })
      .catch((err) => u.handleError(next, err, helper.modelName));
    } else {
      u.forbidden(next);
    }
  },
}; // exports
