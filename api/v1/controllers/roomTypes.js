/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/roomTypes.js
 */
'use strict';

const helper = require('../helpers/nouns/roomTypes');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');

module.exports = {

  /**
   * DELETE /roomTypes/{key}
   *
   * Deletes the roomType and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteRoomTypes(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * GET /roomTypes
   *
   * Finds zero or more roomTypes and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findRoomTypes(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /roomTypes/{key}
   *
   * Retrieves the roomType and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getRoomType(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /roomTypes/{key}
   *
   * Update the specified roomType
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchRoomType(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * POST /roomTypes
   *
   * Creates a new roomType and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postRoomTypes(req, res, next) {
    doPost(req, res, next, helper);
  },

}; // exports
