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

const featureToggles = require('feature-toggles');
const apiErrors = require('../apiErrors');
const config = require('../../../config.js');
const helper = require('../helpers/nouns/events');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPost = require('../helpers/verbs/doPost');
const doPostBulk = require('../helpers/verbs/doPostBulk');
const u = require('../helpers/verbs/utils');
const publisher = u.publisher;
const httpStatus = require('../constants').httpStatus;
const DEFAULT_LIMIT = config.botEventLimit;
const kueSetup = require('../../../jobQueue/setup');
const kue = kueSetup.kue;

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

  /**
   * POST /events/bulk
   *
   * Upserts multiple events. Returns "OK" without waiting for the creates to
   * happen.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   * @returns {Promise} - A promise that resolves to the response object,
   * indicating merely that the bulk create request has been received.
   */
  bulkPostEvent(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    const value = req.swagger.params.queryBody.value;
    const body = { status: 'OK' };

    /**
     * Performs bulk upsert through worker, cache, or db model.
     * Works regardless of whether user if provided or not.
     *
     * @param {Object} user Sequelize result. Optional
     * @returns {Promise} a promise that resolves to the response object
     * with status and body
     */
    function bulkPost(user) {
      helper.model.bulkCreate(value, user);
      u.logAPI(req, resultObj, body, value.length);
      return Promise.resolve(res.status(httpStatus.OK).json(body));
    } // bulkPost
    
    bulkPost(req.user)
      .catch((err) => u.handleError(next, err, helper.modelName));
  }, // bulkPostEvent
}; // exports

