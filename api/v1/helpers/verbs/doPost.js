/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doPost.js
 */
'use strict';

const u = require('./utils');
const httpStatus = require('../../constants').httpStatus;
const logAuditAPI = require('../../../../utils/loggingUtil').logAuditAPI;

/**
 * Creates a new record and sends it back in the json response with status
 * code 201.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to post.
 */
function doPost(req, res, next, props) {
  const resultObj = { reqStartTime: new Date() };
  const toPost = req.swagger.params.queryBody.value;
  u.mergeDuplicateArrayElements(toPost, props);
  props.model.create(toPost)
  .then((o) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    resultObj.recordCount = 1;
    if (props.loggingEnabled) {
      logAuditAPI(req, props.modelName, o);
    }

    resultObj.retval = o.dataValues;
    u.logAPI(req, resultObj);
    return res.status(httpStatus.CREATED)
    .json(u.responsify(o, props, req.method));
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doPost;
