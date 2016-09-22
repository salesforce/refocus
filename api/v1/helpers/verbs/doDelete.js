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
const logAPI = require('../../../../utils/loggingUtil').logAPI;

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
  u.findByKey(props, req.swagger.params)
  .then((o) => o.destroy())
  .then((o) => {
    if (props.loggingEnabled) {
      logAPI(req, props.modelName, o);
    }

    return res.status(httpStatus.OK).json(u.responsify(o, props, req.method));
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doDelete;
