/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doGet.js
 */
'use strict';

const u = require('./utils');
const httpStatus = require('../../constants').httpStatus;
const redisCache = require('../../../../cache/redisCache').client;
const cacheExpiry = require('../../../../config').CACHE_EXPIRY_IN_SECS;

/**
 * Retrieves a record and sends it back in the json response with status code
 * 200.
 * NOTE: Sequelize is not able to generate the right postgres sql aggeragate
 * query for Subject and Aspect objects to count the samples associated with
 * them. So, these models are scoped before finding them and the length
 * of the associated sample array is used as the sample count.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to retrieve.
 */
function doGet(req, res, next, props) {
  if (props.cacheEnabled) {
    const reqParams = req.swagger.params;
    let cacheKey = reqParams.key.value;

    // cache key is combination of key and fields in specified order.
    if (reqParams.fields && reqParams.fields.value) {
      cacheKey += reqParams.fields.value;
    }

    redisCache.get(cacheKey, (cacheErr, reply) => {
      if (cacheErr || !reply) {
        // if err or no reply, get from db and set redis cache
        u.findByKey(props, req.swagger.params)
        .then((o) => {
          res.status(httpStatus.OK).json(u.responsify(o, props, req.method));

          // cache the object by cacheKey. Store the key-value pair in cache
          // with an expiry of 1 minute (60s)
          const strObj = JSON.stringify(o);
          redisCache.setex(cacheKey, cacheExpiry, strObj);
        })
        .catch((err) => u.handleError(next, err, props.modelName));
      } else {
        // get from cache
        const dbObj = JSON.parse(reply);
        res.status(httpStatus.OK).json(u.responsify(dbObj, props, req.method));
      }
    });
  } else {
    u.findByKey(props, req.swagger.params)
    .then((o) => {
      res.status(httpStatus.OK).json(u.responsify(o, props, req.method));
    })
    .catch((err) => u.handleError(next, err, props.modelName));
  }
}

module.exports = doGet;
