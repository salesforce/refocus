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

module.exports = {
  addCollectorsToGroup,
  createCollectorGroup,
};
