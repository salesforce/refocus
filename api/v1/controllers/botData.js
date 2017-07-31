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
const doPost = require('../helpers/verbs/doPost');
const doPatch = require('../helpers/verbs/doPatch');
const doDelete = require('../helpers/verbs/doDelete');

module.exports = {

  /**
   * DELETE /botData/{key}
   *
   * Deletes the botData and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteBotData(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * PATCH /botData/{key}
   *
   * Update the specified botData
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchBotData(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * POST /botData
   *
   * Creates a new botData and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postBotData(req, res, next) {
    doPost(req, res, next, helper);
  },

}; // exports
