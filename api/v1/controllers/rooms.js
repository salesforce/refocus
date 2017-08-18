/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/rooms.js
 */
'use strict';

const helper = require('../helpers/nouns/rooms');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');

module.exports = {

  /**
   * DELETE /rooms/{key}
   *
   * Deletes the room and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteRooms(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * GET /rooms
   *
   * Finds zero or more rooms and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findRooms(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /rooms/{key}
   *
   * Retrieves the room and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getRoom(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /rooms/{key}
   *
   * Update the specified room
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchRoom(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * POST /rooms
   *
   * Creates a new room and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postRooms(req, res, next) {
    doPost(req, res, next, helper);
  },

}; // exports
