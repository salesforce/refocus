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
'use strict'; // eslint-disable-line strict

const u = require('./utils');
const publisher = u.publisher;
const event = u.realtimeEvents;
const httpStatus = require('../../constants').httpStatus;
const featureToggles = require('feature-toggles');
const constants = require('../../../../cache/sampleStore').constants;
const redisModelSample = require('../../../../cache/models/samples');

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
  const resultObj = { reqStartTime: new Date() }; // for logging
  let delPromise;
  if (featureToggles.isFeatureEnabled(constants.featureName) &&
   props.modelName === 'Sample') {
    const sampleName = req.swagger.params.key.value.toLowerCase();
    delPromise = redisModelSample.deleteSample(sampleName);
  } else {
    delPromise = u.findByKey(
        props, req.swagger.params
      )
      .then((o) => u.isWritable(req, o,
          featureToggles.isFeatureEnabled('enforceWritePermission')))
      .then((o) => o.destroy());
  }

  delPromise
  .then((o) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
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

    // publish the delete event to the redis channel
    if (props.publishEvents) {
      publisher.publishSample(o, props.associatedModels.subject,
          event.sample.del);
    }

    // when a resource is deleted, delete all its associations too
    u.deleteAllAssociations(o, assocNames);
    u.logAPI(req, resultObj, o);
    return res.status(httpStatus.OK).json(u.responsify(o, props, req.method));
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doDelete;
