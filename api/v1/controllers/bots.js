/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/bots.js
 */
'use strict';

const helper = require('../helpers/nouns/bots');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');

module.exports = {

  /**
   * DELETE /bots/{key}
   *
   * Deletes the bot and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteBots(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * GET /bots
   *
   * Finds zero or more bots and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findBots(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /bots/{key}
   *
   * Retrieves the bot and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getBot(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /bots/{key}
   *
   * Update the specified bot
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchBot(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * POST /bots
   *
   * Creates a new bot and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postBots(req, res, next) {
    doPost(req, res, next, helper);
  },

  /**
   * PUT /bots/{key}
   *
   * Overrides the bot with that ID
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putBots(req, res, next) {
    doPut(req, res, next, helper);
  },

}; // exports
