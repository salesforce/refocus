/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doDeleteAllBToMAssoc.js
 */
'use strict';

const u = require('./utils');
const httpStatus = require('../../constants').httpStatus;

/**
 * Deletes all the associations of the resource and sends back no content
 * with a status of code 204.
 *
 * @param {IncomingMessage} req - The request object`
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the resource
 * whose association has to be deleted
 * @param {String} assocName - The name of the association associated with the
 * model
 *
 */
function doDeleteAllBToMAssoc(req, res, next, // eslint-disable-line max-params
              props, assocName) {
  const resultObj = { reqStartTime: req.timestamp };
  const params = req.swagger.params;
  u.findByKey(props, params)
  .then((o) => u.isWritable(req, o))
  .then((o) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    u.deleteAllAssociations(o, [assocName]);
    u.logAPI(req, resultObj, o.dataValues);
    res.status(httpStatus.NO_CONTENT).json();
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doDeleteAllBToMAssoc;
