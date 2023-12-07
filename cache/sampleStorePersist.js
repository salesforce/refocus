/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./cache/sampleStorePersist.js
 *
 * Functions for saving the redis sample store to the db.
 */
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const Sample = require('../db').Sample;
const redisCachePromise = require('./redisCache');
const samsto = require('./sampleStore');
const constants = samsto.constants;
const logger = require('@salesforce/refocus-logging-client');

const infoLoggingEnabled =
  featureToggles.isFeatureEnabled('enableSampleStoreInfoLogging');

/**
 * Truncate the sample table in the DB and persist all the samples from redis
 * into the empty table.
 *
 * @returns {Promise} - which resolves to number of samples persisted to db
 */
function storeSampleToDb() {
  if (infoLoggingEnabled) {
    logger.info('Persist to db started :|. This will start by truncating the ' +
      'sample table followed by persisting the sample to db');
  }
  return redisCachePromise
  .then(redisCache => {
    const redisClient = redisCache.client.sampleStore;
    return Sample.destroy({ truncate: true, force: true })
    .then(() => {
      if (infoLoggingEnabled) {
        logger.info('truncated the sample table :|');
      }
  
      return redisClient.sMembers(constants.indexKey.sample);
    })
    .then((keys) => keys.map((key) => ['hGetAll', key]))
    .then((cmds) => redisClient.multi(cmds).exec())
    .then((res) => {
      if (infoLoggingEnabled) {
        logger.info('Preparing list of samples to persist...');
        logger.info(`Checking ${res.length} samples...`);
      }
  
      const samplesToCreate = res.map((sample) => {
        sample.relatedLinks = JSON.parse(sample.relatedLinks);
        return sample;
      })
      .filter((s) => {
        if (!s.aspectId || !s.subjectId) {
          logger.warn('Skipping sample with missing aspectId or subjectId: ',
            JSON.stringify(s));
          return false;
        }
  
        return true;
      });
      if (infoLoggingEnabled) {
        logger.info(`Bulk creating ${samplesToCreate.length} samples...`);
      }
  
      return Sample.bulkCreate(samplesToCreate);
    })
    .then((retval) => {
      if (infoLoggingEnabled) {
        logger.info('persisted redis sample store to db :D');
      }
  
      return retval.length;
    });
  })
  .catch(error => {
    console.error('Error using Redis client:', error);
  })
} // storeSampleToDb

/**
 * Calls the storeSampleToDb function to store sample data back to DB.
 *
 * @returns {Promise} which resolves to number of samples persisted to db if
 *  redis sample store feature is enabled, or false on error or if feature is
 *  disabled.
 */
function persist() {
  if (!featureToggles.isFeatureEnabled(constants.featureName)) {
    return Promise.resolve(false);
  }

  return storeSampleToDb()
  .catch((err) => {
    // NO-OP
    logger.error(err); // eslint-disable-line
    Promise.resolve(false);
  });
} // persist

module.exports = {
  persist,
  storeSampleToDb,
};
