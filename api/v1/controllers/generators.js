/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/generators.js
 */
'use strict'; // eslint-disable-line strict

const helper = require('../helpers/nouns/generators');
const doDeleteOneAssoc = require('../helpers/verbs/doDeleteOneBToMAssoc');
const doPostWriters = require('../helpers/verbs/doPostWriters');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doGetWriters = require('../helpers/verbs/doGetWriters');
const u = require('../helpers/verbs/utils');
const constants = require('../constants');
const Aspect = require('../helpers/nouns/aspects').model;
const apiErrors = require('../apiErrors');
const apiUtils = require('./utils');
const Op = require('sequelize').Op;

/**
 * Validate that user has write permissions on given aspects.
 * @param  {Array} aspects - Array of aspect names
 * @param  {Object} req - Request object
 * @returns {Promise} Resolves if user has write permission on all aspects, else
 * rejects
 */
function validateGeneratorAspectsPermissions(aspects, req) {
  if (!aspects) { // put and patch may not have aspects in query body
    return Promise.resolve();
  }

  if (!req) {
    return Promise.reject(
      new apiErrors.ValidationError('req is required argument')
    );
  }

  const getAspectPromises = [];
  aspects.forEach((aspNameFromGen) => {
    getAspectPromises.push(
      Aspect.findOne({ where: { name: { [Op.iLike]: aspNameFromGen } } })
      .then((asp) => {
        if (!asp) { // error if aspect not found
          return {
            aspectName: aspNameFromGen,
            error: new apiErrors.ResourceNotFoundError('Aspect not found'),
          };
        }

        // returns aspect object or forbidden error
        return u.isWritable(req, asp);
      })
      .catch((err) => {
        const res = { aspectName: aspNameFromGen, error: err };
        return res;
      })
    );
  });

  /**
   * results is an array of: either aspect objects with valid permission or
   * errors corresponding to each aspect
   */
  return Promise.all(getAspectPromises)
  .then((results) => {
    const aspInvalidPerm = [];

    /**
     * There can be different kinds of error: Aspect not found, resource not
     * writable by user, resource write protected if token not provided etc.
     * If there are errors for resource not writable by user, we create a
     * list of those aspects and throw an error at last if everything else
     * is fine.
     * If there is some other error case, we throw that error right away,
     * with aspect name added as info to the error.
     */
    for (let i = 0; i < results.length; i++) {
      const error = results[i].error;
      if (error) {
        if (error.name === 'ForbiddenError' &&
         error.message === 'Insufficient Privileges') {
          aspInvalidPerm.push(results[i].aspectName);
        } else {
          // aspect name added to all errors already
          error.info = results[i].aspectName;
          return Promise.reject(error);
        }
      }
    }

    if (aspInvalidPerm.length > 0) {
      return Promise.reject(new apiErrors.ForbiddenError({
        explanation: 'Insufficient Privileges',
      }));
    }

    return Promise.resolve();
  });
}

module.exports = {
  validateGeneratorAspectsPermissions, // exported for testing purposes

  /**
   * GET /generators
   *
   * Finds zero or more generators and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findGenerators(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /generators/{key}
   *
   * Retrieves the generator and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getGenerator(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /generators/{key}
   *
   * Modifies the generator and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchGenerator(req, res, next) {
    apiUtils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
    const resultObj = { reqStartTime: req.timestamp };
    const requestBody = req.swagger.params.queryBody.value;
    validateGeneratorAspectsPermissions(requestBody.aspects, req)
    .then(() => u.findByKey(helper, req.swagger.params))
    .then((o) => u.isWritable(req, o))
    .then((o) => {
      u.patchArrayFields(o, requestBody, helper);
      return o.updateWithCollectors(requestBody);
    })
    .then((retVal) => u.handleUpdatePromise(resultObj, req, retVal, helper, res))
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * POST /generators/{key}
   *
   * Modifies the generator and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postGenerator(req, res, next) {
    apiUtils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
    const resultObj = { reqStartTime: req.timestamp };
    const params = req.swagger.params;
    u.mergeDuplicateArrayElements(params.queryBody.value, helper);
    const toPost = params.queryBody.value;
    toPost.createdBy = req.user.id;
    validateGeneratorAspectsPermissions(toPost.aspects, req)
    .then(() =>
      helper.model.createWithCollectors(toPost))
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      u.sortArrayObjectsByField(helper, o); // order collectors by name
      u.logAPI(req, resultObj, o);
      res.status(constants.httpStatus.CREATED)
      .json(u.responsify(o, helper, req.method));
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * PUT /generators/{key}
   *
   * Modifies the generator and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putGenerator(req, res, next) {
    apiUtils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
    const resultObj = { reqStartTime: req.timestamp };
    const toPut = req.swagger.params.queryBody.value;
    const puttableFields =
      req.swagger.params.queryBody.schema.schema.properties;
    let instance;

    /*
     * Find the instance, then update it.
     * Will throw error if there are duplicate
     * or non-existent collectors in request
     */
    validateGeneratorAspectsPermissions(toPut.aspects, req)
    .then(() => u.findByKey(helper, req.swagger.params))
    .then((o) => u.isWritable(req, o))
    .then((o) => {
      instance = o;
      return helper.model.validateCollectors(toPut.possibleCollectors);
    })
    .then((_collectors) => {
      // prevent overwrite of reloaded collectors on update
      delete puttableFields.possibleCollectors;

      // mock possibleCollectors on instance so we don't need to reload
      // again to get the currentCollector
      instance.possibleCollectors = _collectors;
      return instance.setPossibleCollectors(_collectors);
    })
    .then(() => u.updateInstance(instance, puttableFields, toPut))
    .then(() => instance.reload())
    .then((retVal) =>
      u.handleUpdatePromise(resultObj, req, retVal, helper, res)
    )
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * GET /generators/{key}/writers
   *
   * Retrieves all the writers associated with the generator
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getGeneratorWriters(req, res, next) {
    doGetWriters.getWriters(req, res, next, helper);
  },

  /**
   * GET /generators/{key}/writers/userNameOrId
   *
   * Determine whether a user is an authorized writer for an generator and
   * returns the user record if so.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getGeneratorWriter(req, res, next) {
    doGetWriters.getWriter(req, res, next, helper);
  },

  /**
   * POST /generators/{key}/writers
   *
   * Add one or more users to an generator’s list of authorized writers.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postGeneratorWriters(req, res, next) {
    doPostWriters(req, res, next, helper);
  },

  /**
   * DELETE /generators/{keys}/writers/userNameOrId
   *
   * Deletes a user from an generator’s list of authorized writers.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteGeneratorWriter(req, res, next) {
    const userNameOrId = req.swagger.params.userNameOrId.value;
    doDeleteOneAssoc(req, res, next, helper,
        helper.belongsToManyAssoc.users, userNameOrId);
  },
}; // exports
