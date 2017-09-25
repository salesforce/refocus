/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doPatch.js
 */
'use strict'; // eslint-disable-line strict

const featureToggles = require('feature-toggles');
const u = require('./utils');
const publisher = u.publisher;
const event = u.realtimeEvents;
const httpStatus = require('../../constants').httpStatus;
const constants = require('../../../../cache/sampleStore').constants;
const redisModelSample = require('../../../../cache/models/samples');
const helper = require('../nouns/perspectives');
const redisCache = require('../../../../cache/redisCache').client.cache;

/**
 * Updates a record and sends the udpated record back in the json response
 * with status code 200.
 *
 * PATCH will only update the attributes provided in the body of the request.
 * Other attributes will not be updated.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to patch.
 */
function doPatch(req, res, next, props) {
  const resultObj = { reqStartTime: req.timestamp };
  const requestBody = req.swagger.params.queryBody.value;
  const patchPromise = u.findByKey(
    props, req.swagger.params
  )
  .then((o) => u.isWritable(req, o))
  .then((o) => {

    /*
     * To avoid timeouts when patching samples; force the update, even if
     * the value has not changed. Adding this to the "before update hook"
     * does give the needed effect; so adding it here!!!.
     */
    if (props.modelName === 'Sample') {
      o.changed('value', true);
    } else if (props.modelName === 'Perspective') {

      /*
       * Clone the object so that we can copy the new request object values
       * in memory and validate them, instead of updating the db object in
       * memory (which will prevent updating the object in db).
       */
      const clonedObj = JSON.parse(JSON.stringify(o.get()));

      // check the updated version of the perspective
      helper.validateFilterAndThrowError(
        Object.assign(clonedObj, requestBody)
      );
    }

    u.patchJsonArrayFields(o, requestBody, props);
    u.patchArrayFields(o, requestBody, props);

    return (props.modelName === 'Generator') ?
      o.updateWithCollectors(requestBody, u.whereClauseForNameInArr) :
      o.update(requestBody);
  });

  patchPromise
  .then((retVal) => u.handleUpdatePromise(resultObj, req, retVal, props, res))
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doPatch;
