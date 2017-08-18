/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * cache/model/room.js
 */
'use strict'; // eslint-disable-line strict

const helper = require('../../api/v1/helpers/nouns/rooms');
const fu = require('../../api/v1/helpers/verbs/findUtils.js');
const utils = require('../../api/v1/helpers/verbs/utils');
const sampleStore = require('../sampleStore');
const constants = sampleStore.constants;
const redisClient = require('../redisCache').client.sampleStore;
const u = require('../../utils/filters');
const modelUtils = require('./utils');
const redisErrors = require('../redisErrors');
const ONE = 1;
const TWO = 2;

// using the bluebird promise implementation instead of the native promise
const Promise = require('bluebird');

function convertStringsToNumbersOrBoolean(room) {

  // convert the strings into numbers or boolean
  room.id = parseInt(room.id);
  room.active = room.active.toLowerCase() == "true" ;
  return room;
}


module.exports = {

   /**
   * Patch sample. First get sample, if not found, throw error, else get aspect.
   * Update request body with required fields based on value and related links
   * if needed. Update sample. Then get updated sample, attach aspect and return
   * response. Note: Message body and message code will be updated if provided,
   * else no fields for message body/message code in redis object.
   * @param  {Object} params - Request parameters
   * @param {String} userName - The user performing the write operation
   * @returns {Promise} - Resolves to a sample object
   */
  patchRoom(params, userName) {
    const reqBody = params.queryBody.value;
    return redisClient.hgetallAsync(key)
    .then((room) => {
      if (!room) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Room not found.',
        });
      }

    })
    .then(() => {
      if (reqBody.value) {
        const status = sampleUtils.computeStatus(aspectObj, reqBody.value);
        if (currSampObj[sampFields.STATUS] !== status) {
          reqBody[sampFields.PRVS_STATUS] = currSampObj[sampFields.STATUS];
          reqBody[sampFields.STS_CHNGED_AT] = new Date().toISOString();
          reqBody[sampFields.STATUS] = status;
        }

        reqBody[sampFields.UPD_AT] = new Date().toISOString();
      }

      if (reqBody.relatedLinks) {
        reqBody[sampFields.RLINKS] = reqBody.relatedLinks;
      }

      // stringify arrays
      constants.fieldsToStringify.sample.forEach((field) => {
        if (reqBody[field]) {
          reqBody[field] = JSON.stringify(reqBody[field]);
        }
      });
      return redisOps.setHashMultiPromise(sampleType, sampleName, reqBody);
    })
    .then(() => redisOps.getHashPromise(sampleType, sampleName))
  },

  /**
   * Returns room with filter options if provided.
   * @param  {Object} req - Request object
   * @param  {Object} res - Result object
   * @param  {Object} logObject - Log object
   * @returns {Promise} - Resolves to a room objects
   */
  getRoom(req, res, logObject) {
    const opts = modelUtils.getOptionsFromReq(req.swagger.params, helper);
    const key = sampleStore.toKey(constants.objectType.room, opts.filter.key);
    return redisClient.hgetallAsync(key)
    .then((room) => {
      console.log(room)
      if (!room) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Room not found.',
        });
      }

      room = convertStringsToNumbersOrBoolean(room);

      logObject.dbTime = new Date() - logObject.reqStartTime; // log db time

      // convert the time fields to appropriate format
      room.createdAt = new Date(room.createdAt).toISOString();
      room.updatedAt = new Date(room.updatedAt).toISOString();

      // add api links
      room.apiLinks = utils.getApiLinks(
        room.name, helper, req.method
      );

      const result = sampleStore.arrayStringsToJson(
        room, constants.fieldsToStringify.room
      );

      return result;
    });
  },

  /**
   * Finds rooms with filter options if provided. We get room keys from
   * redis using default alphabetical order. Then we apply limit/offset and
   * wildcard expr on room names. Using filtered keys we get rooms
   * from redis in an array. Then, we apply wildcard
   * expr (other than name) to rooms array, then we sort, then apply
   * limit/offset and finally field list filters.
   * @param  {Object} req - Request object
   * @param  {Object} res - Result object
   * @param  {Object} logObject - Log object
   * @returns {Promise} - Resolves to a list of all rooms objects
   */
  findRooms(req, res, logObject) {
    const opts = modelUtils.getOptionsFromReq(req.swagger.params, helper);
    const response = [];

    if (opts.limit || opts.offset) {
      res.links({
        prev: req.originalUrl,
        next: fu.getNextUrl(req.originalUrl, opts.limit, opts.offset),
      });
    }

    console.log(opts.filter.hasOwnProperty('name'))
    // console.log(getOwnPropertyNames(opts.filter))

    // get all rooms sorted lexicographically
    return redisClient.sortAsync(constants.indexKey.room, 'alpha')
    .then((allroomKeys) => {
      console.log(allroomKeys)
      const commands = [];
      const filteredroomKeys = modelUtils
        .applyFiltersOnResourceKeys(allroomKeys, opts);

      filteredroomKeys.forEach((roomKey) => {
        commands.push(['hgetall', roomKey]);
      });

      return redisClient.batch(commands).execAsync();
    })
    .then((rooms) => {
      logObject.dbTime = new Date() - logObject.reqStartTime; // log db time
      const filteredrooms = modelUtils.applyFiltersOnResourceObjs(rooms, opts);
      filteredrooms.forEach((room) => {
        console.log(room)
        room = convertStringsToNumbersOrBoolean(room);
        // convert the time fields to appropriate format
        room.createdAt = new Date(room.createdAt).toISOString();
        room.updatedAt = new Date(room.updatedAt).toISOString();

        // add api links
        room.apiLinks = utils.getApiLinks(
          room.name, helper, req.method
        );
        response.push(room); // add room to response
      });

      return response;
    });
  },
}; // exports
