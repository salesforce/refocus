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
const doPatch = require('../helpers/verbs/doPatch');

module.exports = {

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

}; // exports
