/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/postUtils.js
 */
'use strict'; // eslint-disable-line strict
const constants = require('../../constants');
const logAPI = require('../../../../utils/apiLog').logAPI;
const publisher = require('../../../../realtime/redisPublisher');
const realtimeEvents = require('../../../../realtime/constants').events;
const authUtils = require('../authUtils');
const u = require('./utils');
const featureToggles = require('feature-toggles');

/**
 * @param {Object} params From swagger
 * @param {Object} props The helpers/nouns module for the given DB model
 * @param {Object} req From express
 */
function makePostPromise(params, props, req) {
  const toPost = params.queryBody.value;
  if (featureToggles.isFeatureEnabled('returnUser')) {
    return authUtils.getUser(req)
    .then((user) => {
      if (user) {
        toPost.createdBy = user.id;
      }

      return props.model.create(toPost, user);
    }) // if no user found, create the model with the user
    .catch(() => props.model.create(toPost));
  }

  if (props.modelName === 'Generator') {
    return props.model.createWithCollectors(toPost,
      u.whereClauseForNameInArr, u.sortArrayObjectsByField);
  }

  return props.model.create(toPost);
}

/**
 *
 * @param {Object} o Sequelize object
 * @param {Object} resultObj For logging
 * @param {Object} props The helpers/nouns module for the given DB model
 * @param {Object} res From express
 * @param {Object} req From express
 */
function handlePostResult(o, resultObj, props, res, req) {
  resultObj.dbTime = new Date() - resultObj.reqStartTime;
  logAPI(req, resultObj, o);

  // publish the update event to the redis channel
  if (props.publishEvents) {
    publisher.publishSample(o, props.associatedModels.subject,
      realtimeEvents.sample.add, props.associatedModels.aspect);
  }

  // order collectors by name
  if (props.modelName === 'Generator' && o.collectors) {
    const returnObj = o.get ? o.get() : o;
    u.sortArrayObjectsByField(returnObj.collectors, 'name');
    return res.status(constants.httpStatus.CREATED).json(
      u.responsify(returnObj, props, req.method));
  }

  /*
   * if response directly from sequelize, call reload to attach
   * the associations
   */
  if (featureToggles.isFeatureEnabled('returnUser') && o.get) {
    o.reload()
    .then(() => res.status(constants.httpStatus.CREATED).json(
        u.responsify(o, props, req.method)));
  } else {
    return res.status(constants.httpStatus.CREATED).json(
      u.responsify(o, props, req.method));
  }
}

module.exports = {

  handlePostResult,

  makePostPromise,
};
