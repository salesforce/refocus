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
'use strict'; // eslint-disable-line strict

const helper = require('../helpers/nouns/profiles');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');

module.exports = {

  /**
   * DELETE /profiles/{key}
   *
   * Deletes the profile and sends it back in the response. Only
   * available to users with Admin profile.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteProfile(req, res, next) {
    if (req.headers.IsAdmin) {
      doDelete(req, res, next, helper);
    } else {
      u.forbidden(next);
    }
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
   * Other attributes will not be updated. Only available to users with Admin
   * profile.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchProfile(req, res, next) {
    if (req.headers.IsAdmin) {
      doPatch(req, res, next, helper);
    } else {
      u.forbidden(next);
    }
  },

  /**
   * POST /profiles
   *
   * Creates a new profile and sends it back in the response. Only
   * available to users with Admin profile.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postProfile(req, res, next) {
    if (req.headers.IsAdmin) {
      doPost(req, res, next, helper);
    } else {
      u.forbidden(next);
    }
  },

  /**
   * PUT /profiles/{key}
   *
   * Updates a profile and sends it back in the response. If any attributes
   * are missing from the body of the request, those attributes are cleared.
   * Only available to users with Admin profile.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putProfile(req, res, next) {
    if (req.headers.IsAdmin) {
      doPut(req, res, next, helper);
    } else {
      u.forbidden(next);
    }
  },
}; // exports
