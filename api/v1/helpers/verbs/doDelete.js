/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doDelete.js
 */
'use strict';

const u = require('./utils');
const httpStatus = require('../../constants').httpStatus;
const featureToggles = require('feature-toggles');
const logAuditAPI = require('../../../../utils/loggingUtil').logAuditAPI;

/**
 * Deletes a record and sends the deleted record back in the json response
 * with status code 200.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to delete.
 */
function doDelete(req, res, next, props) {
  const resultObj = { reqStartTime: new Date() };
  u.findByKey(props, req.swagger.params)
  .then((o) => u.isWritable(req, o,
      featureToggles.isFeatureEnabled('enforceWritePermission')))
  .then((o) => o.destroy())
  .then((o) => {
    if (props.loggingEnabled) {
      logAuditAPI(req, props.modelName, o);
    }

    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    resultObj.recordCount = 1;
    const assocNames = [];

    /**
     * If props.belongsToManyAssoc defined, take the values of the object and
     * push it into the assocNames array
     */
    if (props.belongsToManyAssoc) {
      Object.keys(props.belongsToManyAssoc)
      .forEach((key) => assocNames.push(props.belongsToManyAssoc[key])
    );
    }

    // when a resource is deleted, delete all its associations too
    u.deleteAllAssociations(o, assocNames);
    resultObj.retval = o.dataValues;
    u.logAPI(req, resultObj);
    return res.status(httpStatus.OK).json(u.responsify(o, props, req.method));
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doDelete;
