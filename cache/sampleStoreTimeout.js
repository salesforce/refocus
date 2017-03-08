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
const sampleStore = require('./sampleStore');
const redisClient = require('./redisCache').client.sampleStore;
const isTimedOut = require('../db/helpers/sampleUtils').isTimedOut;
const constants = require('../api/v1/constants');
const ONE = 1;
const TWO = 2;

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
    const curr = now || new Date();
    let numberTimedOut = 0;
    let numberEvaluated = 0;

    return new Promise((resolve, reject) => {
      redisClient.smembersAsync(sampleStore.constants.indexKey.sample)
      .then((allSamples) => {
        const commands = [];
        const aspectType = sampleStore.constants.objectType.aspect;

        allSamples.forEach((sampKey) => {
          const aspectName = sampKey.split('|')[ONE];
          commands.push(['hgetall', sampKey]); // get sample
          commands.push(
            ['hgetall', sampleStore.toKey(aspectType, aspectName)]
          );
        });

        return redisClient.batch(commands).execAsync();
      })
      .then((redisResponses) => {
        const samples = [];
        const aspects = [];
        const sampCmds = [];

        for (let num = 0; num < redisResponses.length; num += TWO) {
          samples.push(redisResponses[num]);
          aspects.push(redisResponses[num + ONE]);
        }

        for (let num = 0; num < samples.length; num++) {
          const samp = samples[num];
          const asp = aspects[num];
          const sampUpdDateTime = new Date(samp.updatedAt);
          if (asp && isTimedOut(asp.timeout, curr, sampUpdDateTime)) {
            const sampType = sampleStore.constants.objectType.sample;

            const objToUpdate = {
              value: constants.statuses.Timeout,
              status: constants.statuses.Timeout,
              previousStatus: samp.status,
              statusChangedAt: new Date().toString(),
              updatedAt: new Date().toString(),
            };
            sampCmds.push([
              'hmset',
              sampleStore.toKey(sampType, samp.name),
              objToUpdate,
            ]);
            numberTimedOut++;
          }
        }

        numberEvaluated = samples.length;
        return redisClient.batch(sampCmds).execAsync();
      })
      .then(() => resolve({ numberEvaluated, numberTimedOut }))
      .catch(reject);
    });
  },
};
