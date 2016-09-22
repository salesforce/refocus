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
'use strict';

const u = require('./utils');
const httpStatus = require('../../constants').httpStatus;
const logAPI = require('../../../../utils/loggingUtil').logAPI;

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
  const toPut = req.swagger.params.queryBody.value;
  const puttableFields =
    req.swagger.params.queryBody.schema.schema.properties;
  u.findByKey(props, req.swagger.params)
  .then((o) => {
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
      } else {
        o.set(key, toPut[key]);
      }
    }

    return o.save();
  })
  .then((o) => u.handleAssociations(toPut, o, props, req.method))
  .then((o) => {
    if (props.loggingEnabled) {
      logAPI(req, props.modelName, o);
    }

    return res.status(httpStatus.OK).json(u.responsify(o, props, req.method));
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doPut;
