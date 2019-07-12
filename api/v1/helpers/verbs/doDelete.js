/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doDelete.js
 */
'use strict'; // eslint-disable-line strict

const u = require('./utils');
const publisher = u.publisher;
const event = u.realtimeEvents;
const redisModelSample = require('../../../../cache/models/samples');
const redisCache = require('../../../../cache/redisCache').client.cache;

/**
 * Deletes a record and sets res.local so the controller can send back the
 * response with status code 200.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to delete.
 */
function doDelete(req, res, next, props) {
  res.locals.resultObj = { reqStartTime: req.timestamp }; // for logging
  let delPromise;
  let obj;
  if (props.modelName === 'Sample') {
    const sampleName = req.swagger.params.key.value.toLowerCase();
    delPromise = redisModelSample.deleteSample(sampleName, req.user);
  } else {
    delPromise = u.findByKey(props, req.swagger.params)
    .then((o) => u.isWritable(req, o))
    .then((o) => {
      /*
       * An empty array is returned when destroy is called on an instance of a
       * model that has hard delete turned on. We still want to return the
       * deleted instance in all the cases. So, before the instance is
       * destroyed it is saved and for models with hard deleted turned on this
       * saved instance is returned.
       */
      obj = o;
      return o.destroy();
    });
  }

  return delPromise
  .then((o) => {
    res.locals.retVal = o === undefined || o.length === 0 ? obj : o;
    res.locals.resultObj.dbTime = new Date() -
      res.locals.resultObj.reqStartTime;
    const assocNames = [];

    /*
     * If props.belongsToManyAssoc defined, take the values of the object and
     * push it into the assocNames array
     */
    if (props.belongsToManyAssoc) {
      Object.keys(props.belongsToManyAssoc)
        .forEach((key) => assocNames.push(props.belongsToManyAssoc[key]));
    }

    // publish the delete event to the redis channel
    if (props.publishEvents) {
      publisher.publishSample(res.locals.retVal, event.sample.del);
    }

    // update the cache
    if (props.cacheEnabled) {
      const getCacheKey = req.swagger.params.key.value;
      const findCacheKey = '{"where":{}}';
      redisCache.del(getCacheKey);
      redisCache.del(findCacheKey);
    }

    // when a resource is deleted, delete all its associations too
    u.deleteAllAssociations(res.locals.retVal, assocNames);
    res.locals.retVal = u.responsify(res.locals.retVal, props, req.method);
    return true;
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doDelete;
