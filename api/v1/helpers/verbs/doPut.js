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
const putUtils = require('./putUtils');

/**
 * @param {Object} o Sequelize instance
 * @param {Object} puttableFields from API
 * @param {Object} toPut from request.body
 * @returns {Promise} the updated instance
 */
function updateInstance(o, puttableFields, toPut) {
  const keys = Object.keys(puttableFields);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (toPut[key] === undefined) {
      let nullish = null;
      if (puttableFields[key].type === 'boolean') {
        nullish = false;
      } else if (puttableFields[key].enum) {
        nullish = puttableFields[key].default;
      }

      o.set(key, nullish);

      // take nullified fields out of changed fields
      o.changed(key, false);
    } else {

      /*
       * value may have changed. set changed to true to
       * trigger checks in the model
       */
      o.changed(key, true);
      o.set(key, toPut[key]);
    }
  }

  return o.save();
}

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
  const resultObj = { reqStartTime: new Date() };
  const puttableFields =
    req.swagger.params.queryBody.schema.schema.properties;

  putUtils.getPutPromise(req, props, puttableFields)
  .then((o) => putUtils.handlePutResponse(o, resultObj, req, res, props))
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doPut;
