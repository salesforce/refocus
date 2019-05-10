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
'use strict'; // eslint-disable-line strict

const u = require('./utils');
const httpStatus = require('../../constants').httpStatus;
const redisCache = require('../../../../cache/redisCache').client.cache;
const cacheExpiry = require('../../../../config').CACHE_EXPIRY_IN_SECS;
const redisModelSample = require('../../../../cache/models/samples');

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
  res.locals.resultObj = { reqStartTime: req.timestamp };
  const reqParams = req.swagger.params;
  const fields = reqParams.fields ? reqParams.fields.value : null;
  const scopes = props.getScopes ? props.getScopes : [];

  // only cache requests with no params
  if (props.cacheEnabled && !fields) {
    const cacheKey = reqParams.key.value;
    return redisCache.getAsync(cacheKey)
      .then((reply) => {
        // get from cache
        if (reply) {
          res.locals.resultObj.dbTime = new Date() -
            res.locals.resultObj.reqStartTime;
          res.locals.retVal = u.responsify(JSON.parse(reply), props, req.method);
          return new Promise(resolve, reject).resolve(true);
        }

        throw new Error('no reply');
      })
      .catch((cacheErr) => {
        // if err or no reply, get from db and set redis cache
        return u.findByKey(props, req.swagger.params, scopes)
          .then((o) => {
            res.locals.resultObj.dbTime = new Date() -
              res.locals.resultObj.reqStartTime;
            res.locals.retVal = u.responsify(o, props, req.method);

            // cache the object by cacheKey. Store the key-value pair in cache
            // with an expiry of 1 minute (60s)
            const strObj = JSON.stringify(o);
            redisCache.setex(cacheKey, cacheExpiry, strObj);
            return true;
          });
      })
      .catch((err) => u.handleError(next, err, props.modelName));
  } else {
    let getPromise;
    if (props.modelName === 'Sample') {
      getPromise = redisModelSample.getSample(req.swagger.params);
    } else {
      getPromise = u.findByKey(props, req.swagger.params, scopes);
    }

    return getPromise.then((o) => {
      const returnObj = o.get ? o.get() : o;
      u.sortArrayObjectsByField(props, returnObj);
      res.locals.resultObj.dbTime = new Date() -
        res.locals.resultObj.reqStartTime;
      res.locals.retVal = u.responsify(returnObj, props, req.method);
      return true;
    })
      .catch((err) => u.handleError(next, err, props.modelName));
  }
}

module.exports = doGet;
