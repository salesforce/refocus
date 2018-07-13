/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./cache/sampleStoreTimeout.js
 *
 * Timeout samples
 */
'use strict'; // eslint-disable-line strict
const logInvalidHmsetValues = require('../utils/common').logInvalidHmsetValues;
const sampleStore = require('./sampleStore');
const redisClient = require('./redisCache').client.sampleStore;
const isTimedOut = require('../db/helpers/sampleUtils').isTimedOut;
const constants = require('../api/v1/constants');
const fieldsToStringify = require('./sampleStore').constants.fieldsToStringify;
const redisErrors = require('./redisErrors');
const rconf = require('../config').redis;
const IORedis = require('ioredis');
const ioredisClient = new IORedis(rconf.instanceUrl.sampleStore);
const featureToggles = require('feature-toggles');
const ONE = 1;

/**
 * Create sample array from responses using the samples count
 * calculated before. The remaining are aspects. Create a hash of
 * aspects, aspname -> asp object. When analyzing samples, get aspect
 * from this hash using sample aspect name.
 * @param  {Array} samples - Samples to be timedout
 * @param  {Hash} aspects - Aspects hash, name-> object
 * @param  {Date} curr - Current datetime
 * @returns {Object} - with sampCmds and timedOutSamples properties.
 * sampCmds contains the commands needed to timeout samples and timedOutSamples
 * contains the samples that needs to be timedout
 */
function getSampleTimeoutComponents(samples, aspects, curr) {
  const sampCmds = [];
  const timedOutSamples = [];

  for (let num = 0; num < samples.length; num++) {
    const samp = samples[num];
    const aspName = samp.name.split('|')[ONE];

    if (!aspName) {
      throw new redisErrors.ResourceNotFoundError({
        explanation: 'Aspect not found.',
      });
    }

    const asp = aspects[aspName.toLowerCase()];
    const sampUpdDateTime = new Date(samp.updatedAt).toISOString();

    /*
     * Update sample if aspect exists, sample status is other than TimeOut and
     * sample is timed out.
     */
    if (asp && isTimedOut(asp.timeout, curr, sampUpdDateTime)) {
      const objToUpdate = {
        value: constants.statuses.Timeout,
        status: constants.statuses.Timeout,
        previousStatus: samp.status,
        statusChangedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const fullSampObj = Object.assign({}, objToUpdate);
      fullSampObj.name = samp.name;
      fullSampObj.aspect =
        sampleStore.arrayObjsStringsToJson(asp, fieldsToStringify.aspect);
      fullSampObj.aspectId = fullSampObj.aspect.id;
      timedOutSamples.push(fullSampObj);

      const sampleKey = sampleStore
        .toKey(sampleStore.constants.objectType.sample, samp.name);
      logInvalidHmsetValues(sampleKey, objToUpdate);
      sampCmds.push([
        'hmset',
        sampleKey,
        objToUpdate,
      ]);
    }
  }

  return { sampCmds, timedOutSamples };
} // getSampleTimeoutComponents

module.exports = {

  /**
   * Invalidates samples which were last updated before the "timeout" specified
   * by the aspect. Get all samples and corresponding aspects. If the sample
   * should be timed out, set sample value, status, previous status, status
   * changed at and updated at fields.
   * @param  {Date} now - Date object
   * @returns {Promise} - Resolves to the number of evaluated and timed out
   * samples
   */
  doTimeout(now) {
    const curr = now ?
      new Date(now).toISOString() :
      new Date().toISOString();
    let numberTimedOut = 0;
    let numberEvaluated = 0;
    let samplesCount = 0;
    let timedOutSamples;

    // ioredis use
    const membersCmd = featureToggles.isFeatureEnabled('enableIORedis') ?
      ioredisClient.smembers(sampleStore.constants.indexKey.sample) :
      redisClient.smembersAsync(sampleStore.constants.indexKey.sample);

    return membersCmd
    .then((allSamples) => {
      const commands = [];
      const aspectsSet = new Set();
      const aspectType = sampleStore.constants.objectType.aspect;

      /**
       * Add commands to get all samples first, create an aspect set with
       * unique aspect names. Add commands to get the aspects then.
       */
      samplesCount = allSamples.length;
      allSamples.forEach((sampKey) => {
        const aspectName = sampKey.split('|')[ONE];
        aspectsSet.add(aspectName);
        commands.push(['hgetall', sampKey]);
      });

      aspectsSet.forEach((aspName) => {
        commands.push(
          ['hgetall', sampleStore.toKey(aspectType, aspName)]
        );
      });

      // ioredis use
      if (featureToggles.isFeatureEnabled('enableIORedis'))
        return ioredisClient.multi(commands).exec();

      return redisClient.batch(commands).execAsync();
    })
    .then((redisResponses) => {
      const aspects = {};
      const samples = [];

      // Create Sample List
      for (let num = 0; num < samplesCount; num++) {
        // ioredis response format [[null], res1], [null, res2]]
        // node redis response format [res1, res2]
        const samp = featureToggles.isFeatureEnabled('enableIORedis') ?
          redisResponses[num][ONE] : redisResponses[num];
        if (samp && samp.status &&
        samp.status !== constants.statuses.Timeout) {
          samples.push(samp);
        }
      }

      // Create aspects object as key value pair i.e {'aspect_name': aspect}
      for (let num = samplesCount; num < redisResponses.length; num++) {
        // ioredis response format [[null], res1], [null, res2]]
        // node redis response format [res1, res2]
        const aspect = featureToggles.isFeatureEnabled('enableIORedis') ?
          redisResponses[num][ONE] : redisResponses[num];
        if (aspect && aspect.name) {
          aspects[aspect.name.toLowerCase()] = aspect;
        }
      }

      // console.log(samples, aspects, curr);
      const retObj = getSampleTimeoutComponents(samples, aspects, curr);
      timedOutSamples = retObj.timedOutSamples;
      const sampCmds = retObj.sampCmds;
      numberEvaluated = samples.length;
      numberTimedOut = sampCmds.length;

      // ioredis use
      if (featureToggles.isFeatureEnabled('enableIORedis'))
        return ioredisClient.multi(sampCmds).exec();

      return redisClient.batch(sampCmds).execAsync();
    })
    .then(() => {
      const res = { numberEvaluated, numberTimedOut, timedOutSamples };
      return res;
    })
    .catch((err) => {
      throw err;
    });
  }, //doTimeout
};
