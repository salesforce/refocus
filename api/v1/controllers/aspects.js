/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/aspects.js
 */
'use strict';

const helper = require('../helpers/nouns/aspects');
const userProps = require('../helpers/nouns/users');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;

module.exports = {

  /**
   * DELETE /aspects/{key}
   *
   * Deletes the aspect and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteAspect(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * GET /aspects
   *
   * Finds zero or more aspects and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findAspects(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /aspects/{key}
   *
   * Retrieves the aspect and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getAspect(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * GET /aspects/{key}/writers
   *
   * Retrieves all the writers associated with the aspect
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getAspectWriters(req, res, next) {
    const params = req.swagger.params;
    const options = {};
    u.findAssociatedInstances(helper,
      params, helper.userModelAssociationName, options)
    .then((o) => {
      const retval = u.responsify(o, helper, req.method);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // getAspectWriters

  /**
   * GET /aspects/{key}/writers/userNameOrId
   *
   * Determine whether a user is an authorized writer for an aspect and
   * returns the user record if so.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getAspectWriter(req, res, next) {
    const params = req.swagger.params;
    const options = {};
    options.where = u.whereClauseForNameOrId(params.userNameOrId.value);
    u.findAssociatedInstances(helper,
      params, helper.userModelAssociationName, options)
    .then((o) => {
    // if the resolved object is an empty array, throw a ResourceNotFound error
      u.throwErrorForEmptyArray(o,
        params.userNameOrId.value, userProps.modelName);
      const retval = u.responsify(o, helper, req.method);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // getAspectWriter

  /**
   * PATCH /aspects/{key}
   *
   * Updates the aspect and sends it back in the response. PATCH will only
   * update the attributes of the aspect provided in the body of the request.
   * Other attributes will not be updated.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchAspect(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * POST /aspects
   *
   * Creates a new aspect and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postAspect(req, res, next) {
    doPost(req, res, next, helper);
  },

  /**
   * PUT /aspects/{key}
   *
   * Updates an aspect and sends it back in the response. If any attributes
   * are missing from the body of the request, those attributes are cleared.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putAspect(req, res, next) {
    doPut(req, res, next, helper);
  },

  /**
   * DELETE /v1/aspects/{key}/tags/
   * DELETE /v1/aspects/{key}/tags/{tagName}
   *
   * Deletes specified/all tags from the aspect and sends updated aspect in the
   * response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteAspectTags(req, res, next) {
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) => {
      let updatedTagArray = [];
      if (params.tagName) {
        updatedTagArray =
          u.deleteArrayElement(o.tags, params.tagName.value);
      }

      return o.update({ tags: updatedTagArray });
    })
    .then((o) => {
      const retval = u.responsify(o, helper, req.method);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * DELETE /v1/aspects/{key}/relatedLinks/
   * DELETE /v1/aspects/{key}/relatedLinks/{relName}
   *
   * Deletes specified/all related Links from the aspect and sends updated
   * aspect in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteAspectRelatedLinks(req, res, next) {
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) => {
      let jsonData = [];
      if (params.relName) {
        jsonData =
          u.deleteAJsonArrayElement(o.relatedLinks, params.relName.value);
      }

      return o.update({ relatedLinks: jsonData });
    })
    .then((o) => {
      const retval = u.responsify(o, helper, req.method);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

}; // exports
