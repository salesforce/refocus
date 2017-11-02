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
const heartbeatUtils = require('../helpers/verbs/heartbeatUtils');
const featureToggles = require('feature-toggles');
const constants = require('../constants');

module.exports = {

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
    const resultObj = { reqStartTime: req.timestamp };
    const requestBody = req.swagger.params.queryBody.value;
    let oldCollectors;
    u.findByKey(helper, req.swagger.params)
    .then((o) => u.isWritable(req, o))
    .then((o) => {
      u.patchArrayFields(o, requestBody, helper);
      oldCollectors = o.collectors.map(collector => collector.name);
      return o.updateWithCollectors(requestBody, u.whereClauseForNameInArr);
    })
    .then((retVal) => {
      const newCollectors = retVal.collectors.map(collector => collector.name);
      heartbeatUtils.trackGeneratorChanges(retVal, oldCollectors, newCollectors);
      return u.handleUpdatePromise(resultObj, req, retVal, helper, res);
    })
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
    const resultObj = { reqStartTime: req.timestamp };
    const params = req.swagger.params;
    u.mergeDuplicateArrayElements(params.queryBody.value, helper);
    const toPost = params.queryBody.value;

    if (featureToggles.isFeatureEnabled('returnUser')) {
      toPost.createdBy = req.user.id;
    }

    helper.model.createWithCollectors(toPost,
      u.whereClauseForNameInArr)
    .then((o) => featureToggles.isFeatureEnabled('returnUser') ?
        o.reload() : o)
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      u.logAPI(req, resultObj, o);

      const oldCollectors = [];
      const newCollectors = o.collectors.map(collector => collector.name);
      heartbeatUtils.trackGeneratorChanges(o, oldCollectors, newCollectors);

      // order collectors by name
      u.sortArrayObjectsByField(helper, o);

      res.status(constants.httpStatus.CREATED).json(
          u.responsify(o, helper, req.method));
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
    const resultObj = { reqStartTime: req.timestamp };
    const toPut = req.swagger.params.queryBody.value;
    const puttableFields =
      req.swagger.params.queryBody.schema.schema.properties;
    let instance;
    let collectors = [];

    /*
     * Find the instance, then update it.
     * Will throw error if there are duplicate
     * or non-existent collectors in request
     */
    u.findByKey(helper, req.swagger.params)
    .then((o) => u.isWritable(req, o))
    .then((o) => {
      instance = o;
      return helper.model.validateCollectors(
        toPut.collectors, u.whereClauseForNameInArr);
    })
    .then((_collectors) => {
      collectors = _collectors;
      return u.updateInstance(instance, puttableFields, toPut);
    })
    .then((_updatedInstance) => {
      instance = _updatedInstance;
      const oldCollectors = instance.collectors.map(c => c.name);
      const newCollectors = collectors.map(c => c.name);
      heartbeatUtils.trackGeneratorChanges(instance, oldCollectors, newCollectors);
      return instance.setCollectors(collectors);
    }) // need reload instance to attach associations
    .then(() => instance.reload())
    .then((retVal) => u.handleUpdatePromise(resultObj, req, retVal, helper, res))
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
   * Add one or more users to an generator’s list of authorized writers. If
   * the "enableRedisSampleStore" is turned on add the writers to the generator
   * stored in redis
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
   * Deletes a user from an generator’s list of authorized writers. If the
   * "enableRedisSampleStore" feature is turned on, delete that user from the
   * authorized list of writers stored in the cache for this generator.
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
