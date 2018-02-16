/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/users.js
 */
'use strict';

const helper = require('../helpers/nouns/users');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');

module.exports = {

  /**
   * DELETE /users/{key}
   *
   * Deletes the user and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteUser(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * GET /users
   *
   * Finds zero or more users and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findUsers(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /users/{key}
   *
   * Retrieves the user and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getUser(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /users/{key}
   *
   * Updates the user and sends it back in the response. PATCH will only
   * update the attributes of the user provided in the body of the request.
   * Other attributes will not be updated.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchUser(req, res, next) {
    if (req.headers.IsAdmin) {
      doPatch(req, res, next, helper);
    } else if (req.body.profileId && !req.headers.IsAdmin) {
      // Only an admin may modify a user's profile
      u.forbidden(next);
    } else {
      doPatch(req, res, next, helper);
    }
  },

  /**
   * POST /users
   *
   * Creates a new user and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postUser(req, res, next) {
    doPost(req, res, next, helper);
  },

  /**
   * PUT /users/{key}
   *
   * Updates a user and sends it back in the response. If any attributes are
   * missing from the body of the request, those attributes are cleared.
   * If the user is an admin, they can put to any user except for
   * the out of box admin.
   * Else if the user is not an admin, they can only PUT themself, if the
   * profileId does not change
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putUser(req, res, next) {
    const user = req.user;
    if (req.headers.IsAdmin) {
      doPut(req, res, next, helper);
    } else if (req.swagger.params.key.value === user.name &&
      user.profileId === req.body.profileId) {
      /*
       * Allow normal user iff user PUTTing themself AND profileId does
       * not change
       */
      doPut(req, res, next, helper);
    } else {
      u.forbidden(next);
    }
  },
}; // exports
