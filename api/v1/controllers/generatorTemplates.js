/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/generatorTemplates.js
 */
'use strict'; // eslint-disable-line strict

const helper = require('../helpers/nouns/generatorTemplates');
const doDeleteOneAssoc = require('../helpers/verbs/doDeleteOneBToMAssoc');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doGetWriters = require('../helpers/verbs/doGetWriters');
const doPostWriters = require('../helpers/verbs/doPostWriters');
const u = require('../helpers/verbs/utils');
const apiErrors = require('../apiErrors');

module.exports = {
  /**
   * GET /generatorTemplates
   *
   * Finds zero or more generatorTemplates and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findGeneratorTemplates(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /generatorTemplates/{key}
   *
   * Retrieves the generatorTemplate and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getGeneratorTemplate(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /generatorTemplates/{key}
   *
   * Modifies the generatorTemplate and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchGeneratorTemplate(req, res, next) {
    const allowedToPatch = ['isPublished'];
    const illegal = Object.keys(req.body)
    .filter((f) => !allowedToPatch.includes(f));
    if (illegal.length) {
      const verr = new apiErrors.ValidationError(
        { explanation: `You cannot modify these attributes: ${illegal}` }
      );
      return u.handleError(next, verr, helper.modelName);
    }

    doPatch(req, res, next, helper);
  },

  /**
   * POST /generatorTemplates/{key}
   *
   * Creates a new generatorTemplate and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postGeneratorTemplate(req, res, next) {
    doPost(req, res, next, helper);
  },

  /**
   * GET /generatorTemplates/{key}/writers
   *
   * Retrieves all the writers associated with the generatorTemplate
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getGeneratorTemplateWriters(req, res, next) {
    doGetWriters.getWriters(req, res, next, helper);
  },

  /**
   * GET /generatorTemplates/{key}/writers/userNameOrId
   *
   * Determine whether a user is an authorized writer for a generatorTemplate and
   * returns the user record if so.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getGeneratorTemplateWriter(req, res, next) {
    doGetWriters.getWriter(req, res, next, helper);
  },

  /**
   * POST /generatorTemplates/{key}/writers
   *
   * Add one or more users to a generatorTemplate’s list of authorized writers. If
   * the "enableRedisSampleStore" is turned on add the writers to the
   * generatorTemplate stored in redis
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postGeneratorTemplateWriters(req, res, next) {
    doPostWriters(req, res, next, helper);
  },

  /**
   * DELETE /generatorTemplates/{keys}/writers/userNameOrId
   *
   * Deletes a user from a generatorTemplate’s list of authorized writers. If the
   * "enableRedisSampleStore" feature is turned on, delete that user from the
   * authorized list of writers stored in the cache for this generatorTemplate.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteGeneratorTemplateWriter(req, res, next) {
    const userNameOrId = req.swagger.params.userNameOrId.value;
    doDeleteOneAssoc(req, res, next, helper,
      helper.belongsToManyAssoc.users, userNameOrId);
  },

}; // exports

