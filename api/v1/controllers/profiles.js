/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/profiles.js
 */
'use strict';

const helper = require('../helpers/nouns/profiles');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');

module.exports = {

  /**
   * DELETE /profiles/{key}
   *
   * Deletes the profile and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteProfile(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * GET /profiles
   *
   * Finds zero or more profiles and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findProfiles(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /profiles/{key}
   *
   * Retrieves the profile and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getProfile(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /profiles/{key}
   *
   * Updates the profile and sends it back in the response. PATCH will only
   * update the attributes of the profile provided in the body of the request.
   * Other attributes will not be updated.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchProfile(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * POST /profiles
   *
   * Creates a new profile and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postProfile(req, res, next) {
    doPost(req, res, next, helper);
  },

  /**
   * PUT /profiles/{key}
   *
   * Updates a profile and sends it back in the response. If any attributes
   * are missing from the body of the request, those attributes are cleared.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putProfile(req, res, next) {
    doPut(req, res, next, helper);
  },

}; // exports
