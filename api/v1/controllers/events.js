/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/events.js
 */
'use strict';

const config = require('../../../config.js');
const helper = require('../helpers/nouns/events');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPost = require('../helpers/verbs/doPost');
const DEFAULT_LIMIT = config.botEventLimit;

module.exports = {

  /**
   * GET /events
   *
   * Finds zero or more events and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findEvents(req, res, next) {
    if (!req.swagger.params.limit.value) {
      req.swagger.params.limit.value = DEFAULT_LIMIT;
    }

    doFind(req, res, next, helper);
  },

  /**
   * GET /events/{key}
   *
   * Retrieves the event and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getEvent(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * POST /events
   *
   * Creates a new event and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postEvents(req, res, next) {
    doPost(req, res, next, helper);
  },

}; // exports
