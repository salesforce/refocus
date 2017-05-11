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
  const toPost = req.swagger.params.queryBody.value;
  u.mergeDuplicateArrayElements(toPost, props);
  let postPromise;
  if (featureToggles.isFeatureEnabled(constants.featureName) &&
   props.modelName === 'Sample') {
    const rLinks = toPost.relatedLinks;
    if (rLinks) {
      u.checkDuplicateRLinks(rLinks);
    }

    postPromise = authUtils.getUser(req)
    .then((user) => {
      const userObject = user && featureToggles.isFeatureEnabled('returnCreatedBy') ?
        { name: user.name, id: user.id, email: user.email } : false;
      return redisModelSample.postSample(req.swagger.params, userObject);
    })
    .catch((err) => {
      if (err.status === 403) {

        // no user found
        return redisModelSample.postSample(req.swagger.params, false);
      } else {
        u.handleError(next, err, props.modelName);
      }
    });
  } else {
    if (featureToggles.isFeatureEnabled('enforceWritePermission') &&
      props.modelName === 'Sample') {
      postPromise = u.createSample(req, props);
    } else if (!featureToggles.isFeatureEnabled('returnCreatedBy')) {
      postPromise = props.model.create(toPost);
    } else {
      postPromise = authUtils.getUser(req)
      .then((user) => {
        if (user) {
          toPost.createdBy = user.id;
        }

        return props.model.create(toPost);
      })
      .catch((err) => {
        if (err.status === 403) {
          return props.model.create(toPost);
        } else {
          u.handleError(next, err, props.modelName);
        }
      });
    }
  }

  postPromise.then((o) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    u.logAPI(req, resultObj, o);

    // publish the update event to the redis channel
    if (props.publishEvents) {
      publisher.publishSample(o, props.associatedModels.subject,
        event.sample.add, props.associatedModels.aspect);
    }

    // if response directly from sequelize, call reload to attach
    // the associations
    if (featureToggles.isFeatureEnabled('returnCreatedBy') && o.get) {
      o.reload()
      .then((reloaded) => res.status(httpStatus.CREATED).json(
          u.responsify(o, props, req.method)));
    } else {
      return res.status(httpStatus.CREATED)
      .json(u.responsify(o, props, req.method));
    }
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doPost;
