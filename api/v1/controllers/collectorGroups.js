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
const verbUtils = require('../helpers/verbs/utils');
const CREATED = require('../constants').httpStatus.CREATED;

/**
 * POST /collectorGroups
 *
 * Creates a new collector group and sends it back in the response.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function createCollectorGroups(req, res, next) {
  apiUtils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);

  const resultObj = { reqStartTime: req.timestamp };
  const params = req.swagger.params;

  verbUtils.mergeDuplicateArrayElements(params.queryBody.value, helper);

  const body = params.queryBody.value;
  body.createdBy = req.user.id;

  helper.model.createCollectorGroup(body)
  .then((collectorGroup) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    const recordCountOverride = null;
    verbUtils.logAPI(req, resultObj, collectorGroup, recordCountOverride);
    res.status(CREATED)
      .json(verbUtils.responsify(collectorGroup, helper, req.method));
  })
  .catch((err) => verbUtils.handleError(next, err, helper.modelName));
}

module.exports = {
  createCollectorGroups,
};
