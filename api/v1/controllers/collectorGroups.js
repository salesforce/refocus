/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/collectorGroups.js
 */
'use strict'; // eslint-disable-line strict
const helper = require('../helpers/nouns/collectorGroups');
const apiUtils = require('./utils');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const doDelete = require('../helpers/verbs/doDelete');
const doPatch = require('../helpers/verbs/doPatch');

/**
 * POST /collectorGroups
 *
 * Creates a new collector group and sends it back in the response.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function createCollectorGroup(req, res, next) {
  apiUtils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);

  const resultObj = { reqStartTime: req.timestamp };
  const params = req.swagger.params;

  u.mergeDuplicateArrayElements(params.queryBody.value, helper);

  const body = params.queryBody.value;
  body.createdBy = req.user.id;

  helper.model.createCollectorGroup(body)
  .then((collectorGroup) => {
    const recordCountOverride = null;
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    u.logAPI(req, resultObj, collectorGroup, recordCountOverride);

    const response = u.responsify(collectorGroup, helper, req.method);
    res.status(httpStatus.CREATED).json(response);
  })
  .catch((err) => u.handleError(next, err, helper.modelName));
} // createCollectorGroup

/**
 * POST /collectorGroups/{name}/collectors
 *
 * Add collectors to the group. Reject if any collector named in the array
 * is already assigned to either this or a different group.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function addCollectorsToGroup(req, res, next) {
  apiUtils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
  const resultObj = { reqStartTime: req.timestamp };
  const params = req.swagger.params;
  let cg;

  u.mergeDuplicateArrayElements(params.queryBody.value, helper);

  u.findByKey(helper, params)
    .then((o) => u.isWritable(req, o))
    .then((collectorGroup) =>
      collectorGroup.addCollectorsToGroup(params.queryBody.value))
    .then((added) => (cg = added))
    .then(() => {
      const recordCountOverride = null;
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      u.logAPI(req, resultObj, cg, recordCountOverride);
    })
    .then(() => {
      const response = u.responsify(cg, helper, req.method);
      res.status(httpStatus.OK).json(response);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
} // addCollectorsToGroup

/**
 * DELETE /collectorGroups/{name}/collectors
 *
 * Remove the named collectors from the group. Reject if any collector named
 * in the array is not already assigned to this group.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function deleteCollectorsFromGroup(req, res, next) {
  apiUtils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
  const resultObj = { reqStartTime: req.timestamp };
  const params = req.swagger.params;

  u.mergeDuplicateArrayElements(params.queryBody.value, helper);

  u.findByKey(helper, params)
    .then((o) => u.isWritable(req, o))
    .then((collectorGroup) =>
      collectorGroup.deleteCollectorsFromGroup(params.queryBody.value))
    .then((cgAfterDelete) => {
      const recordCountOverride = null;
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      u.logAPI(req, resultObj, cgAfterDelete, recordCountOverride);
      const response = u.responsify(cgAfterDelete, helper, req.method);
      res.status(httpStatus.OK).json(response);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
} // deleteCollectorsFromGroup

/**
 * DELETE /collectorGroups/{key}
 *
 * Deletes the collector group and sends it back in the response. Reject if
 * collector group is assigned to any sample generators.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function deleteCollectorGroup(req, res, next) {
  doDelete(req, res, next, helper);
} // deleteCollectorGroup

/**
 * PATCH /collectorGroups/{key}
 *
 * Updates the collector group and sends it back in the response. PATCH will
 * only update the attributes of the collector group provided in the body of
 * the request. Other attributes will not be updated. If updating the array of
 * collectors, reject if any of the collectors is already assigned to a
 * different collector group.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function patchCollectorGroup(req, res, next) {
  apiUtils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
  const resultObj = { reqStartTime: req.timestamp };
  const params = req.swagger.params;
  let cg;

  u.mergeDuplicateArrayElements(params.queryBody.value, helper);

  u.findByKey(helper, params)
    .then((o) => u.isWritable(req, o))
    .then((collectorGroup) => {
      if (params.queryBody.value.hasOwnProperty('collectors')) {
        const colls = params.queryBody.value.collectors;
        delete params.queryBody.value.collectors;
        return collectorGroup.patchCollectors(colls);
      }

      return collectorGroup;
    })
    .then((patched) => (cg = patched))
    .then(() => cg.update(params.queryBody.value))
    .then(() => {
      const recordCountOverride = null;
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      u.logAPI(req, resultObj, cg, recordCountOverride);
    })
    .then(() => {
      const response = u.responsify(cg, helper, req.method);
      res.status(httpStatus.OK).json(response);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
} // patchCollectorGroup

/**
 * PUT /collectorGroups/{key}
 *
 * Updates the collector group and sends it back in the response. If any
 * attributes are missing from the body of the request, those attributes are
 * cleared and/or set to their default value. If updating the array of
 * collectors, reject if any of the collectors is already assigned to a
 * different collector group.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function putCollectorGroup(req, res, next) {
  apiUtils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
  const resultObj = { reqStartTime: req.timestamp };
  const params = req.swagger.params;
  let cg;

  u.mergeDuplicateArrayElements(params.queryBody.value, helper);

  u.findByKey(helper, params)
    .then((o) => u.isWritable(req, o))
    .then((collectorGroup) => {
      let colls = [];
      if (params.queryBody.value.hasOwnProperty('collectors')) {
        colls = params.queryBody.value.collectors;
        delete params.queryBody.value.collectors;
      }

      // Clear the description attribute if not provided in request body
      if (!params.queryBody.value.hasOwnProperty('description')) {
        params.queryBody.value.description = '';
      }

      return collectorGroup.patchCollectors(colls);
    })
    .then((patched) => (cg = patched))
    .then(() => cg.update(params.queryBody.value))
    .then(() => {
      const recordCountOverride = null;
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      u.logAPI(req, resultObj, cg, recordCountOverride);
    })
    .then(() => {
      const response = u.responsify(cg, helper, req.method);
      res.status(httpStatus.OK).json(response);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
} // putCollectorGroup

module.exports = {
  addCollectorsToGroup,
  createCollectorGroup,
  deleteCollectorGroup,
  deleteCollectorsFromGroup,
  patchCollectorGroup,
  putCollectorGroup,
};
