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
const u = require('../helpers/verbs/utils');
const authUtils = require('../helpers/authUtils');

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
    authUtils.profileHasWriteAccess(req, helper.model)
    .then((ok) => {
      if(ok) {
        doDelete(req, res, next, helper);
      } else {
        u.forbidden(next);
      }
    })
    .catch((err) => {
      u.forbidden(next);
    });
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
    authUtils.profileHasWriteAccess(req, helper.model)
    .then((ok) => {
      if(ok) {
        doPatch(req, res, next, helper);
      } else {
        u.forbidden(next);
      }
    })
    .catch((err) => {
      u.forbidden(next);
    });
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
    authUtils.profileHasWriteAccess(req, helper.model)
    .then((ok) => {
      if(ok) {
        doPost(req, res, next, helper);
      } else {
        u.forbidden(next);
      }
    })
    .catch((err) => {
      u.forbidden(next);
    });
  },

}; // exports
