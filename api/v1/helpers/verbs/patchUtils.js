/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/patchUtils.js
 */
'use strict'; // eslint-disable-line strict

const u = require('./utils');
const publisher = u.publisher;
const event = u.realtimeEvents;
const httpStatus = require('../../constants').httpStatus;
const redisCache = require('../../../../cache/redisCache').client.cache;

/**
 * Sends the udpated record back in the json response
 * with status code 200.
 *
 * @param {Object} resultObj - For logging
 * @param {Object} req - The request object
 * @param {Object} retVal - The updated instance
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @param {Object} res - The response object
 * @returns {Object} JSON succcessful response
 */
function handlePatchPromise(resultObj, req, retVal, props, res) {
  resultObj.dbTime = new Date() - resultObj.reqStartTime;
  u.logAPI(req, resultObj, retVal);

  // publish the update event to the redis channel
  if (props.publishEvents) {
    publisher.publishSample(
      retVal, props.associatedModels.subject, event.sample.upd);
  }

  // update the cache
  if (props.cacheEnabled) {
    const getCacheKey = req.swagger.params.key.value;
    const findCacheKey = '{"where":{}}';
    redisCache.del(getCacheKey);
    redisCache.del(findCacheKey);
  }

  return res.status(httpStatus.OK)
    .json(u.responsify(retVal, props, req.method));
}

module.exports = {
  handlePatchPromise,
};
