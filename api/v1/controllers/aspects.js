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

const featureToggles = require('feature-toggles');
const utils = require('./utils');
const apiErrors = require('../apiErrors');
const helper = require('../helpers/nouns/aspects');
const userProps = require('../helpers/nouns/users');
const doDelete = require('../helpers/verbs/doDelete');
const doDeleteAllAssoc =
                    require('../helpers/verbs/doDeleteAllBToMAssoc');
const doDeleteOneAssoc =
                    require('../helpers/verbs/doDeleteOneBToMAssoc');
const doPostAssoc =
                    require('../helpers/verbs/doPostBToMAssoc');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const ZERO = 0;
const ONE = 1;

/**
 * Validates the given fields from request body or url.
 * If fails, throws a corresponding error.
 * @param {Object} requestBody Fields from request body
 * @param {Object} params Fields from url
 */
function validateTags(requestBody, params) {
  let tags = [];
  if (requestBody) {
    tags = requestBody.tags;
  } else if (params) {
    // params.tags.value is a comma delimited string, not empty.
    tags = params.tags.value ? params.tags.value.split(',') : [];
  }

  if (tags && tags.length) {
    if (utils.hasDuplicates(tags)) {
      throw new apiErrors.DuplicateFieldError();
    }
  }
}

/**
 * Validates the aspect request coming in and throws an error if the request
 * does not pass the validation.
 * @param  {Object} req - The request object
 */
function validateRequest(req) {
  utils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
  validateTags(req.body);
} // validateRequest

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
    validateTags(null, req.swagger.params);
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
    const resultObj = { reqStartTime: new Date() };
    const params = req.swagger.params;
    const options = {};
    u.findAssociatedInstances(helper,
      params, helper.belongsToManyAssoc.users, options)
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      const retval = u.responsify(o, helper, req.method);
      u.logAPI(req, resultObj, retval);
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
    const resultObj = { reqStartTime: new Date() };
    const params = req.swagger.params;
    const options = {};
    options.where = u.whereClauseForNameOrId(params.userNameOrId.value);
    u.findAssociatedInstances(helper,
      params, helper.belongsToManyAssoc.users, options)
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;

      // throw a ResourceNotFound error if resolved object is empty array
      u.throwErrorForEmptyArray(o,
        params.userNameOrId.value, userProps.modelName);
      const retval = u.responsify(o, helper, req.method);
      u.logAPI(req, resultObj, retval);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // getAspectWriter

  /**
   * POST /aspects/{key}/writers
   *
   * Add one or more users to an aspect’s list of authorized writers
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postAspectWriters(req, res, next) {
    const params = req.swagger.params;
    const toPost = params.queryBody.value;
    const options = {};
    options.where = u.whereClauseForNameInArr(toPost);
    userProps.model.findAll(options)
    .then((usrs) => {
      doPostAssoc(req, res, next, helper,
        helper.belongsToManyAssoc.users, usrs);
    });
  }, // postAspectWriters

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
    validateRequest(req);
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
    validateRequest(req);
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
    validateRequest(req);
    doPut(req, res, next, helper);
  },

  /**
   * DELETE /aspects/{keys}/writers
   *
   * Deletes all the writers associated with this resource.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteAspectWriters(req, res, next) {
    doDeleteAllAssoc(req, res, next, helper, helper.belongsToManyAssoc.users);
  },

  /**
   * DELETE /aspects/{keys}/writers/userNameOrId
   *
   * Deletes a user from an aspect’s list of authorized writers.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteAspectWriter(req, res, next) {
    const userNameOrId = req.swagger.params.userNameOrId.value;
    doDeleteOneAssoc(req, res, next, helper,
        helper.belongsToManyAssoc.users, userNameOrId);
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
    const resultObj = { reqStartTime: new Date() };
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) =>
      u.isWritable(req, o,
        featureToggles.isFeatureEnabled('enforceWritePermission')))
    .then((o) => {
      let updatedTagArray = [];
      if (params.tagName) {
        updatedTagArray =
          u.deleteArrayElement(o.tags, params.tagName.value);
      }

      return o.update({ tags: updatedTagArray });
    })
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      const retval = u.responsify(o, helper, req.method);
      u.logAPI(req, resultObj, retval);
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
    const resultObj = { reqStartTime: new Date() };
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) =>
      u.isWritable(req, o,
        featureToggles.isFeatureEnabled('enforceWritePermission')))
    .then((o) => {
      let jsonData = [];
      if (params.relName) {
        jsonData =
          u.deleteAJsonArrayElement(o.relatedLinks, params.relName.value);
      }

      return o.update({ relatedLinks: jsonData });
    })
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      const retval = u.responsify(o, helper, req.method);
      u.logAPI(req, resultObj, retval);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

}; // exports
