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
const u = require('./utils');
const featureToggles = require('feature-toggles');

/**
 * @param {Object} params From swagger
 * @param {Object} props The helpers/nouns module for the given DB model
 * @param {Object} req From express
 * @returns {Promise} - which resolves to a created instance of the model
 */
function makePostPromise(params, props, req) {
  const toPost = params.queryBody.value;

  if (featureToggles.isFeatureEnabled('returnUser')) {
    toPost.createdBy = req.user.id;
    return props.model.create(toPost, req.user);
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
 * @returns {Object} - the response returned from the server
 */
function handlePostResult(o, resultObj, props, res, req) {
  resultObj.dbTime = new Date() - resultObj.reqStartTime;
  logAPI(req, resultObj, o);

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
