/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/putUtils.js
 */
'use strict'; // eslint-disable-line strict

const u = require('./utils');
const publisher = u.publisher;
const event = u.realtimeEvents;
const httpStatus = require('../../constants').httpStatus;
const redisCache = require('../../../../cache/redisCache').client.cache;

/**
 * Generic helper to update a resource.
 * If no value was provided for an field, clears that field by setting its
 * value to null (or false for boolean fields).
 *
 * @param {Object} req - The request object
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @param {Array} puttableFields - From swagger
 * @param {Promise} The PUT promise
 */
function getPutPromise(req, props, puttableFields) {
  const toPut = req.swagger.params.queryBody.value;
  return u.findByKey(
    props, req.swagger.params
  )
  .then((o) => u.isWritable(req, o))
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

        // take nullified fields out of changed fields
        o.changed(key, false);
      } else {

        /*
         * value may have changed. set changed to true to
         * trigger checks in the model
         */
        o.changed(key, true);
        o.set(key, toPut[key]);
      }
    }

    return o.save();
  });
}

/**
 * Sends the udpated record back in the json response
 * with status code 200.
 *
 * @param {Object} o - The updated sequelize instance
 * @param {Object} resultObj For logging
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Object} props - The helpers/nouns module for the given DB model
 */
function handlePutResponse(o, resultObj, req, res, props) {
  resultObj.dbTime = new Date() - resultObj.reqStartTime;
  u.logAPI(req, resultObj, o);

  // publish the update event to the redis channel
  if (props.publishEvents) {
    publisher.publishSample(o, props.associatedModels.subject,
     event.sample.upd);
  }

  // update the cache
  if (props.cacheEnabled) {
    const getCacheKey = req.swagger.params.key.value;
    const findCacheKey = '{"where":{}}';
    redisCache.del(getCacheKey);
    redisCache.del(findCacheKey);
  }

  res.status(httpStatus.OK).json(u.responsify(o, props, req.method));
}

module.exports = {
  getPutPromise,
  handlePutResponse,
};
