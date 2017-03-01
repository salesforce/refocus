/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * cache/models/samples.js
 */
'use strict'; // eslint-disable-line strict

const helper = require('../../api/v1/helpers/nouns/samples');
const u = require('../../api/v1/helpers/verbs/utils');
const sampleStore = require('../sampleStore');
const redisClient = require('../redisCache').client.sampleStore;
const constants = sampleStore.constants;
const ZERO = 0;
const ONE = 1;

/**
 * Convert array strings to Json for sample and aspect, then attach aspect to
 * sample.
 * @param  {Object} sampleObj - Sample object from redis
 * @param  {Object} aspectObj - Aspect object from redis
 * @param  {String} method - Request method
 * @returns {Object} - Sample object with aspect attached
 */
function cleanAddAspectToSample(sampleObj, aspectObj, method) {
  let sampleRes = {};
  sampleRes = sampleStore.arrayStringsToJson(
    sampleObj, constants.fieldsToStringify.sample
  );

  const aspect = sampleStore.arrayStringsToJson(
    aspectObj, constants.fieldsToStringify.aspect
  );

  sampleRes.aspect = aspect;

  // add api links
  sampleRes.apiLinks = u.getApiLinks(
    sampleRes.name, helper, method
  );

  return sampleRes;
}

module.exports = {

  /**
   * Retrieves the sample from redis and sends it back in the response.
   * @param  {string} sampleName - Sample name
   * @param  {Object} logObject - Log object
   * @param  {String} method - Type of request method
   * @returns {Promise} - Resolves to a sample object
   */
  getSampleFromRedis(sampleName, logObject, method) {
    const aspectName = sampleName.split('|')[ONE];
    const commands = [];

    // get sample
    commands.push([
      'hgetall',
      sampleStore.toKey(constants.objectType.sample, sampleName),
    ]);

    // get aspect
    commands.push([
      'hgetall',
      sampleStore.toKey(constants.objectType.aspect, aspectName),
    ]);

    return redisClient.batch(commands).execAsync()
    .then((responses) => {
      logObject.dbTime = new Date() - logObject.reqStartTime; // log db time

      // clean and attach aspect to sample
      const sampleRes = cleanAddAspectToSample(
        responses[ZERO], responses[ONE], method
      );

      return sampleRes;
    });
  },

  /**
   * Finds zero or more samples from redis and sends them back in the response.
   * @param  {Object} logObject - Log object
   * @param  {String} method - Type of request method
   * @returns {Promise} - Resolves to a list of all samples objects
   */
  findSamplesFromRedis(logObject, method) {
    const sampleCmds = [];
    const aspectCmds = [];
    const response = [];

    // get all Samples sorted lexicographically
    return redisClient.sortAsync(constants.indexKey.sample, 'alpha')
    .then((allSampleKeys) => {
      // add to commands to get sample
      allSampleKeys.forEach((sampleName) => {
        sampleCmds.push(['hgetall', sampleName]);
      });

      // get all aspect names
      return redisClient.smembersAsync(constants.indexKey.aspect);
    })
    .then((allAspectKeys) => {
      // add to commands to get aspect
      allAspectKeys.forEach((aspectName) => {
        aspectCmds.push(['hgetall', aspectName]);
      });

      // get all samples and aspects
      return Promise.all([
        redisClient.batch(sampleCmds).execAsync(),
        redisClient.batch(aspectCmds).execAsync(),
      ]);
    })
    .then((sampleAndAspects) => {
      logObject.dbTime = new Date() - logObject.reqStartTime; // log db time
      const samples = sampleAndAspects[ZERO];
      const aspects = sampleAndAspects[ONE];

      samples.forEach((sampleObj) => {
        const sampleAspect = aspects.find((aspect) =>
          aspect.name === sampleObj.name.split('|')[ONE]
        );

        const sampleRes = cleanAddAspectToSample(
          sampleObj, sampleAspect, method
        );
        response.push(sampleRes); // add sample to response
      });

      return response;
    });
  },
};
