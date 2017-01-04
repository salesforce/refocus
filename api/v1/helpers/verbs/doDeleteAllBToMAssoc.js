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
 * with a status of code 204. When a "value" is passed only the name or the id
 * of the association matching the resouce will be deleted.
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
function doDeleteAllBToMAssoc(req, res, next, props, assocName) { // eslint-disable-line
  const params = req.swagger.params;
  u.findByKey(props, params)
  .then((o) => {
    u.deleteAllAssociations(o, [assocName]);
    res.status(httpStatus.NO_CONTENT).json();
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doDeleteAllBToMAssoc;
