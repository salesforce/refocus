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
  const resultObj = { reqStartTime: req.timestamp };
  const reqParams = req.swagger.params;
  const fields = reqParams.fields ? reqParams.fields.value : null;
  const scopes = props.getScopes ? props.getScopes : [];

  const opts = u.buildFieldList(reqParams, props.model);

  // only cache requests with no params
  if (props.cacheEnabled && !fields) {
    const cacheKey = reqParams.key.value;

    redisCache.get(cacheKey, (cacheErr, reply) => {
      if (cacheErr || !reply) {
        // if err or no reply, get from db and set redis cache
        u.findByKey(props, reqParams, scopes)
        .then((returnedObject) => {
          resultObj.dbTime = new Date() - resultObj.reqStartTime;

          // cache the object by cacheKey. Store the key-value pair in cache
          // with an expiry of 1 minute (60s)
          const objectCacheFormatted = JSON.stringify(returnedObject);
          redisCache.setex(cacheKey, cacheExpiry, objectCacheFormatted);

          u.removeFieldsFromResponse(opts.fieldsToExclude, returnedObject);
          u.logAPI(req, resultObj, returnedObject);
          res.status(httpStatus.OK).json(
            u.responsify(returnedObject, props, req.method)
          );
        })
        .catch((err) => u.handleError(next, err, props.modelName));
      } else {
        // get from cache
        resultObj.dbTime = new Date() - resultObj.reqStartTime;
        const sequelizeObject = JSON.parse(reply);
        u.logAPI(req, resultObj, sequelizeObject);
        res.status(httpStatus.OK).json(
          u.responsify(sequelizeObject, props, req.method)
        );
      }
    });
  } else {
    let getPromise;
    if (props.modelName === 'Sample') {
      getPromise = redisModelSample.getSample(reqParams);
    } else {
      getPromise = u.findByKey(props, reqParams, scopes);
    }

    getPromise.then((o) => {
      const returnObj = o.get ? o.get() : o;
      resultObj.dbTime = new Date() - resultObj.reqStartTime;

      u.sortArrayObjectsByField(props, returnObj);
      u.removeFieldsFromResponse(opts.fieldsToExclude, returnObj);
      u.logAPI(req, resultObj, returnObj);
      res.status(httpStatus.OK).json(u.responsify(returnObj,
        props, req.method));
    })
    .catch((err) => u.handleError(next, err, props.modelName));
  }
}

module.exports = doGet;
