/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/globalconfig.js
 */
'use strict';

const helper = require('../helpers/nouns/globalconfig');
const doDelete = require('../helpers/verbs/doDelete');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doGet = require('../helpers/verbs/doGet');
const doFind = require('../helpers/verbs/doFind');
const u = require('../helpers/verbs/utils');

module.exports = {

  /**
   * DELETE /globalconfig/{key}
   *
   * Deletes the global config item and sends it back in the response. Only
   * available to users with Admin profile.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteGlobalConfig(req, res, next) {
    if (req.headers.IsAdmin) {
      doDelete(req, res, next, helper);
    } else {
      u.forbidden(next);
    }
  },

  /**
   * GET /globalconfig
   *
   * Retrieves all global config items and sends them back in the response.
   * Available to all users.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findGlobalConfig(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /globalconfig/{key}
   *
   * Retrieves the global config item from the global config cache and sends it
   * back in the response. Available to all users.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getGlobalConfig(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /globalconfig/{key}
   *
   * Updates the global config item and sends it back in the response. Only
   * available to users with Admin profile.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchGlobalConfig(req, res, next) {
    if (req.headers.IsAdmin) {
      doPatch(req, res, next, helper);
    } else {
      u.forbidden(next);
    }
  },

  /**
   * POST /globalconfig
   *
   * Creates a new global config item and sends it back in the response. Only
   * available to users with Admin profile.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postGlobalConfig(req, res, next) {
    if (req.headers.IsAdmin) {
      doPost(req, res, next, helper);
    } else {
      u.forbidden(next);
    }
  },

}; // exports
