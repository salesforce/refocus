/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doPut.js
 */
'use strict'; // eslint-disable-line strict

const u = require('./utils');

/**
 * Updates a record and sends the udpated record back in the json response
 * with status code 200.
 *
 * If no value was provided for an field, clears that field by setting its
 * value to null (or false for boolean fields).
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to put.
 */
function doPut(req, res, next, props) {
  const resultObj = { reqStartTime: req.timestamp };
  const toPut = req.swagger.params.queryBody.value;
  const puttableFields =
    req.swagger.params.queryBody.schema.schema.properties;

  // find the instance, then update it
  u.findByKey(props, req.swagger.params)
  .then((o) => u.isWritable(req, o))
  .then((o) => u.updateInstance(o, puttableFields, toPut))
  .then((retVal) => u.handleUpdatePromise(resultObj, req, retVal, props, res))
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doPut;
