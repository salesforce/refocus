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
const httpStatus = require('../../api/v1/constants').httpStatus;
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
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getSampleFromRedis(req, res, next) {
    const resultObj = { reqStartTime: new Date() }; // for logging
    const sampleName = req.swagger.params.key.value.toLowerCase();
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

    redisClient.batch(commands).execAsync()
    .then((responses) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime; // log db time

      // clean and attach aspect to sample
      const sampleRes = cleanAddAspectToSample(
        responses[ZERO], responses[ONE], res.method
      );

      u.logAPI(req, resultObj, sampleRes); // audit log
      res.status(httpStatus.OK).json(sampleRes);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * Finds zero or more samples from redis and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findSamplesFromRedis(req, res, next) {
    const resultObj = { reqStartTime: new Date() }; // for logging
    const sampleCmds = [];
    const aspectCmds = [];
    const response = [];

    // get all Samples sorted lexicographically
    redisClient.sortAsync(constants.indexKey.sample, 'alpha')
    .then((allSampleKeys) => {
      // add to commands to get sample
      allSampleKeys.forEach((sampleName) => {
        sampleCmds.push(
          ['hgetall', sampleName.toLowerCase()]
        );
      });

      // get all aspect names
      return redisClient.smembersAsync(constants.indexKey.aspect);
    })
    .then((allAspectKeys) => {
      // add to commands to get aspect
      allAspectKeys.forEach((aspectName) => {
        aspectCmds.push(
          ['hgetall', aspectName.toLowerCase()]
        );
      });

      // get all samples and aspects
      return Promise.all([
        redisClient.batch(sampleCmds).execAsync(),
        redisClient.batch(aspectCmds).execAsync(),
      ]);
    })
    .then((sampleAndAspects) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime; // log db time
      const samples = sampleAndAspects[ZERO];
      const aspects = sampleAndAspects[ONE];

      samples.forEach((sampleObj) => {
        const sampleAspect = aspects.find((aspect) =>
          aspect.name === sampleObj.name.split('|')[ONE]
        );

        const sampleRes = cleanAddAspectToSample(
          sampleObj, sampleAspect, res.method
        );
        response.push(sampleRes); // add sample to response
      });
    })
    .then(() => {
      u.logAPI(req, resultObj, response); // audit log
      res.status(httpStatus.OK).json(response);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },
};
