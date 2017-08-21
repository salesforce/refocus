/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doPost.js
 */
'use strict'; // eslint-disable-line strict

const u = require('./utils');
const authUtils = require('../authUtils');
const publisher = u.publisher;
const event = u.realtimeEvents;
const httpStatus = require('../../constants').httpStatus;
const constants = require('../../../../cache/sampleStore').constants;
const redisModelSample = require('../../../../cache/models/samples');
const featureToggles = require('feature-toggles');

/**
 * Creates a new record and sends it back in the json response with status
 * code 201.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to post.
 */
function doPost(req, res, next, props) {
  const resultObj = { reqStartTime: new Date() };
  const params = req.swagger.params;
  const toPost = params.queryBody.value;
  u.mergeDuplicateArrayElements(toPost, props);
  let postPromise;
  const isCacheOnAndIsSample = featureToggles.isFeatureEnabled(constants.featureName) &&
     props.modelName === 'Sample';

  // if either "cache is on" or returnUser, get User
  if (isCacheOnAndIsSample ||
    featureToggles.isFeatureEnabled('returnUser')) {

    postPromise = authUtils.getUser(req)
    .then((user) => u.makePostPromiseWithUser(user, params, isCacheOnAndIsSample, props))
    .catch((err) => {

      // if no user found, proceed with post sample
      if (err.status === httpStatus.FORBIDDEN) {
        return isCacheOnAndIsSample ?
          redisModelSample.postSample(req.swagger.params, false) :
          props.model.create(toPost);
      }

      /*
       * non FORBIDDEN error. Throw it to be caught by the latter .catch.
       * This bypasses the postPromise.then function
       */
      throw err;
    });
  } else {
    postPromise = (props.modelName === 'Sample') ?
      u.createSample(req, props) : props.model.create(toPost);
  }

  return postPromise.then((o) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    u.logAPI(req, resultObj, o);

    // publish the update event to the redis channel
    if (props.publishEvents) {
      publisher.publishSample(o, props.associatedModels.subject,
        event.sample.add, props.associatedModels.aspect);
    }

    // if response directly from sequelize, call reload to attach
    // the associations
    if (featureToggles.isFeatureEnabled('returnUser') && o.get) {
      o.reload()
      .then(() => res.status(httpStatus.CREATED).json(
          u.responsify(o, props, req.method)));
    } else {
      return res.status(httpStatus.CREATED).json(u.responsify(o, props, req.method));
    }
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doPost;
