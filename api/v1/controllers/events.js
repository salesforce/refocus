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
const doPostBulk = require('../helpers/verbs/doPostBulk');
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

    // Extracting type from params to filter by context.type
    if (req.swagger.params.type && req.swagger.params.type.value) {
      req.swagger.params.context = {
        value: {
          type: req.swagger.params.type.value,
        },
      };

      delete req.swagger.params.type;
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

  postBulkEvents(req, res, next) {
    doPostBulk(req, res, next, helper);
  }

}; // exports
