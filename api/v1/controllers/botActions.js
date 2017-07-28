/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/botActions.js
 */
'use strict';

const helper = require('../helpers/nouns/botActions');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');

module.exports = {

  /**
   * DELETE /botActions/{key}
   *
   * Deletes the botAction and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteBotActions(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * GET /botActions
   *
   * Finds zero or more botActions and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findBotActions(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /botActions/{key}
   *
   * Retrieves the botAction and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getBotAction(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /botActions/{key}
   *
   * Update the specified botAction
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchBotAction(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * POST /botActions
   *
   * Creates a new botAction and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postBotActions(req, res, next) {
    doPost(req, res, next, helper);
  },

  /**
   * PUT /botActions/{key}
   *
   * Overrides the botAction with that ID
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putBotActions(req, res, next) {
    doPut(req, res, next, helper);
  },

}; // exports
