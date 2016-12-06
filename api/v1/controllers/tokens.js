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
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;

module.exports = {

  /**
   * DELETE /tokens/{key}
   *
   * Deletes the token metadata record and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteTokenById(req, res, next) {
    doDelete(req, res, next, helper);
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
   * POST /tokens/{key}/restore
   *
   * Restore access for the specified token if access had previously been
   * revoked.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  restoreTokenById(req, res, next) {
    const id = req.swagger.params.key.value;
    helper.model.findById(id)
    .then((o) => {
      console.log('restoreTokenById, found', o.dataValues)
      if (o.isRevoked === 0) {
        throw new Error('Cannot restore a token which had not been revoked');
      }

      return o.restore();
    })
    .then((o) => {
      console.log('restoreTokenById, restored', o.dataValues)
      const retval = u.responsify(o, helper, req.method);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

    /**
   * POST /tokens/{key}/revoke
   *
   * Revoke access for the specified token.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  revokeTokenById(req, res, next) {
    const id = req.swagger.params.key.value;
    helper.model.findById(id)
    .then((o) => {
      console.log('revokeTokenById, found', o.dataValues)
      if (o.isRevoked > 0) {
        throw new Error('Cannot revoke a token which is already revoked');
      }

      return o.revoke();
    })
    .then((o) => {
      console.log('revokeTokenById, revoked', o.dataValues)
      const retval = u.responsify(o, helper, req.method);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },
}; // exports
