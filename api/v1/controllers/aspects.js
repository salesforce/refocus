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
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const utils = require('./utils');
const apiErrors = require('../apiErrors');
const helper = require('../helpers/nouns/aspects');
const userProps = require('../helpers/nouns/users');
const doDelete = require('../helpers/verbs/doDelete');
const doDeleteAllAssoc = require('../helpers/verbs/doDeleteAllBToMAssoc');
const doDeleteOneAssoc = require('../helpers/verbs/doDeleteOneBToMAssoc');
const doPostAssoc = require('../helpers/verbs/doPostBToMAssoc');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doGetWriters = require('../helpers/verbs/doGetWriters');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const redisOps = require('../../../cache/redisOps');

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
    tags = params.tags.value;
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
    doGetWriters.getWriters(req, res, next, helper);
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
    doGetWriters.getWriter(req, res, next, helper);
  }, // getAspectWriter

  /**
   * POST /aspects/{key}/writers
   *
   * Add one or more users to an aspect’s list of authorized writers. If
   * the "enableRedisSampleStore" is turned on add the writers to the aspect
   * stored in redis
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
    let users;
    userProps.model.findAll(options)
    .then((usrs) => {
      users = usrs;
      if (featureToggles.isFeatureEnabled('enableRedisSampleStore')) {
        return u.findByKey(helper, params)
        .then((o) => u.isWritable(req, o))
          .then((o) => redisOps.getValue('aspect', o.name))
          .then((cachedAspect) => {
            if (cachedAspect) {
              const userSet = new Set();
              usrs.forEach((user) => {
                userSet.add(user.dataValues.name);
              });
              cachedAspect.writers = cachedAspect.writers || [];
              Array.from(userSet).forEach((user) => {
                cachedAspect.writers.push(user);
              });
              return redisOps.hmSet('aspect', cachedAspect.name, cachedAspect);
            }

            // reject the promise if the aspect is not found in the cache
            return Promise.reject(new apiErrors.ResourceNotFoundError());
          });
      }

      return Promise.resolve(true);
    })
    .then(() => {
      doPostAssoc(req, res, next, helper,
        helper.belongsToManyAssoc.users, users);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
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

    // check that at least one of the given fields is present in request
    if (featureToggles.isFeatureEnabled('requireHelpEmailOrHelpUrl')) {
      utils.validateAtLeastOneFieldPresent(
        req.body, helper.requireAtLeastOneFields
      );
    }

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

    // check that at least one of the given fields is present in request
    if (featureToggles.isFeatureEnabled('requireHelpEmailOrHelpUrl')) {
      utils.validateAtLeastOneFieldPresent(
        req.body, helper.requireAtLeastOneFields
      );
    }

    doPut(req, res, next, helper);
  },

  /**
   * DELETE /aspects/{keys}/writers
   *
   * Deletes all the writers associated with this resource. If the
   * "enableRedisSampleStore" is turned on, delete all writers for this aspect
   * from the cache too.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteAspectWriters(req, res, next) {
    if (featureToggles.isFeatureEnabled('enableRedisSampleStore')) {
      const params = req.swagger.params;
      u.findByKey(helper, params)
      .then((o) => u.isWritable(req, o))
        .then((o) => redisOps.getValue('aspect', o.name))
        .then((cachedAspect) => {
          if (cachedAspect) {
            cachedAspect.writers = [];
            return redisOps.hmSet('aspect', cachedAspect.name, cachedAspect);
          }

          // reject the promise if the aspect is not found in the cache
          return Promise.reject(new apiErrors.ResourceNotFoundError());
        })
        .then(() => doDeleteAllAssoc(req, res, next, helper,
              helper.belongsToManyAssoc.users))
        .catch((err) => u.handleError(next, err, helper.modelName));
    } else {
      doDeleteAllAssoc(req, res, next, helper, helper.belongsToManyAssoc.users);
    }
  },

  /**
   * DELETE /aspects/{keys}/writers/userNameOrId
   *
   * Deletes a user from an aspect’s list of authorized writers. If the
   * "enableRedisSampleStore" feature is turned on, delete that user from the
   * authorized list of writers stored in the cache for this aspect.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteAspectWriter(req, res, next) {
    const userNameOrId = req.swagger.params.userNameOrId.value;
    let aspectName;
    let userName;
    if (featureToggles.isFeatureEnabled('enableRedisSampleStore')) {
      const params = req.swagger.params;
      u.findByKey(helper, params)
      .then((o) => u.isWritable(req, o))
      .then((o) => {
        aspectName = o.name;
        const options = {};
        options.where = u.whereClauseForNameOrId(params.userNameOrId.value);
        return u.findAssociatedInstances(helper,
         params, helper.belongsToManyAssoc.users, options);
      })
      .then((o) => {
        u.throwErrorForEmptyArray(o,
           params.userNameOrId.value, userProps.modelName);

        // the object "o" here is always an array of length 1
        userName = o[0].dataValues.name;
        return redisOps.getValue('aspect', aspectName);
      })
      .then((cachedAspect) => {
        if (cachedAspect) {
          cachedAspect.writers = cachedAspect.writers
              .filter((writer) => writer !== userName);
          return redisOps.hmSet('aspect', cachedAspect.name, cachedAspect);
        }

        // reject the promise if the aspect is not found in the cache
        return Promise.reject(new apiErrors.ResourceNotFoundError());
      })
      .then(() => doDeleteOneAssoc(req, res, next, helper,
        helper.belongsToManyAssoc.users, userNameOrId))
      .catch((err) => u.handleError(next, err, helper.modelName));
    } else {
      doDeleteOneAssoc(req, res, next, helper,
        helper.belongsToManyAssoc.users, userNameOrId);
    }
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
    const resultObj = { reqStartTime: req.timestamp };
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) =>
      u.isWritable(req, o))
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
    const resultObj = { reqStartTime: req.timestamp };
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) =>
      u.isWritable(req, o))
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
