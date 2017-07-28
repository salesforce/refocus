/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/botData.js
 */
'use strict';

const helper = require('../helpers/nouns/botData');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');

module.exports = {

  /**
   * GET /botData/, /room/{roomID}/bot/{botID}/data, /room/{roomID}/data
   *
   * Finds zero or more botData and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findBotData(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /botData/{key}
   *
   * Retrieves the botData and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getBotData(req, res, next) {
    doGet(req, res, next, helper);
  },

}; // exports
