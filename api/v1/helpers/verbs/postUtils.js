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
'use strict';
const redisModelSample = require('../../../../cache/models/samples');
const sampleStore = require('../../../../cache/sampleStore');
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
  const isCacheOnAndIsSample = featureToggles
    .isFeatureEnabled(sampleStore.constants.featureName) &&
    props.modelName === 'Sample';

  // if either "cache is on" or returnUser, get User
  if (isCacheOnAndIsSample ||
    featureToggles.isFeatureEnabled('returnUser')) {
    return authUtils.getUser(req)
    .then((user) => makePostPromiseWithUser(user, params, isCacheOnAndIsSample, props))
    .catch((err) => {

      // if no user found, proceed with post sample
      if (err.status === constants.httpStatus.FORBIDDEN) {
        return isCacheOnAndIsSample ?
          redisModelSample.postSample(params, false) :
          props.model.create(toPost);
      }

      /*
       *non FORBIDDEN error. Throw it to be caught by the latter .catch.
       * this bypasses the postPromise.then function
       */
      throw err;
    });
  } else {

    // cache is off and returnUser is false.
    if (props.modelName === 'Generator') {
      return props.model.createWithCollectors(toPost,
        u.whereClauseForNameInArr, u.sortArrayObjectsByField);
    }

    return (props.modelName === 'Sample') ?
      u.createSample(req, props) : props.model.create(toPost);
  }
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

  // if response directly from sequelize, call reload to attach
  // the associations
  if (featureToggles.isFeatureEnabled('returnUser') && o.get) {
    o.reload()
    .then(() => res.status(constants.httpStatus.CREATED).json(
        u.responsify(o, props, req.method)));
  } else {
    return res.status(constants.httpStatus.CREATED).json(
      u.responsify(o, props, req.method));
  }
}

/**
 * Given user object, make the post promise.
 *
 * @params {Object} user
 * @params {Object} params Swagger params
 * @params {Boolean} isCacheOnAndIsSample if the resource is a sample
 *  AND the cache is on
 * @params {Object} props From the request
 * @returns {Promise} the post promise
 */
function makePostPromiseWithUser(user, params, isCacheOnAndIsSample, props) {
  const toPost = params.queryBody.value;

  // if cache is on, check relatedLinks
  if (isCacheOnAndIsSample) {
    const rLinks = toPost.relatedLinks;
    if (rLinks) {
      u.checkDuplicateRLinks(rLinks);
    }

    // since cache is on AND get user.
    // populate the user object.
    // need to pass down the user id to populate provider field
    const userObject = user &&
    featureToggles.isFeatureEnabled('returnUser') ?
      { name: user.name, id: user.id, email: user.email } : false;
    return redisModelSample.postSample(params, userObject);
  }

  // cache is off AND returnUser is true.
  // if there is a user, set the provider value.
  if (user) {
    if (props.modelName === 'Sample') {
      toPost.provider = user.id;
    } else {
      toPost.createdBy = user.id;
    }
  }

  return props.model.create(toPost);
}

module.exports = {
  makePostPromiseWithUser,

  handlePostResult,

  makePostPromise,
};
