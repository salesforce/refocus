/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doFindOne.js
 */
'use strict'; // eslint-disable-line strict
const verbUtils = require('./utils');
const findUtils = require('./findUtils');
const httpStatus = require('../../constants').httpStatus;
const apiErrors = require('../../apiErrors');

function doFindOne_(reqResNextWrapper, props, opts, dbTimeObject) {
  return props.model
    .findOne(opts)
    .then((object) => {
      dbTimeObject.dbTime = new Date() - dbTimeObject.reqStartTime;
      if (!object) {
        throw new apiErrors.ResourceNotFoundError({
          explanation: `${props.model} not found`,
        });
      }

      if (props.modelName === 'Lens') {
        delete object.dataValues.library;
      }

      return verbUtils.responsify(object, props, reqResNextWrapper.req.method);
    })
    .catch((err) => verbUtils.handleError(reqResNextWrapper.next, err,
      props.modelName));
} // doFindOne_

/**
 * Convenient method to sort response by field, remove fields and Log API time
 * before sending back the response object to the client.
 *
 * @param props
 * @param responseObject
 * @param reqResNextWrapper
 * @param dbTimeObject
 */
function handleResponse(props, responseObject, reqResNextWrapper,
                        dbTimeObject) {
  verbUtils.sortArrayObjectsByField(props, responseObject);

  verbUtils.removeFieldsFromResponse(props.fieldsToExclude, responseObject);

  verbUtils.logAPI(reqResNextWrapper.req, dbTimeObject, responseObject, null);
  reqResNextWrapper
    .res
    .status(httpStatus.OK)
    .json(responseObject);
} // handleResponse

/**
 * Helper method to find a single matching record.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Object} props - The helpers/nouns module for the given DB model
 */
module.exports = function doFindOne(req, res, next, props) {
  const opts = findUtils.options(req.swagger.params, props);

  const reqResNextWrapper = { req, res, next };
  const dbTimeObject = { reqStartTime: req.timestamp };
  return doFindOne_(reqResNextWrapper, props, opts, dbTimeObject)
    .then((responseObject) => handleResponse(props, responseObject,
      reqResNextWrapper, dbTimeObject))
    .catch((err) => verbUtils.handleError(next, err, props.modelName));
}; // exports
