/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./cache/sampleStoreInit.js
 *
 * Functions for initializing/clearing the redis sample store.
 */
'use strict'; // eslint-disable-line strict
const Sample = require('../db').Sample;
const Aspect = require('../db').Aspect;
const Subject = require('../db').Subject;
const featureToggles = require('feature-toggles');
const redisCachePromise = require('./redisCache');
const samsto = require('./sampleStore');
const logger = require('@salesforce/refocus-logging-client');
const samstoPersist = require('./sampleStorePersist');
const constants = samsto.constants;
const infoLoggingEnabled =
  featureToggles.isFeatureEnabled('enableSampleStoreInfoLogging');
const logInvalidHmsetValues = require('../utils/common').logInvalidHmsetValues;
const redisOps = require('./redisOps');
const Promise = require('bluebird');
const ONE = 1;
const ZERO = 0;

/**
 * Deletes the previousStatuskey (that stores the previous value of the
 * "enableRedisSampleStore" flag).
 * @returns {Promise} - which resolves to 0 when the key is deleted.
 */
async function deletePreviousStatus() {
  return await redisClient.del(constants.previousStatusKey);
} // deletePreviousStatus

/**
 * When passed an array of sample keys, it extracts the subject and aspect name part from
 * each of the key and returns an array of arrays of keys prefixed with
 * "samsto:subaspmap" and "samsto:aspsubmap" respectively . For example if
 * ['samsto:sample:subject1|aspect1','samsto:sample:subject2|aspect2']
 * is the input, the output is
 * [['samsto:subaspmap:subject1','samsto:subaspmap:subject2'],
 * ['samsto:aspsubmap:aspect1','samsto:aspsubmap:aspect2']]
 * @param  {Array} keys - An array of sample keys
 * @returns {Array of arrays} - An array of subaspmap keys and aspsubmap keys
 */
function getResourceMapsKeys(keys) {
  const subAspMapSet = new Set();
  const aspSubMapSet = new Set();

  const subAspPrefix = constants.prefix + constants.separator +
    constants.objectType.subAspMap + constants.separator;

  const aspSubPrefix = constants.prefix + constants.separator +
    constants.objectType.aspSubMap + constants.separator;

  keys.forEach((key) => {
    const keyNameParts = key.split(constants.separator);
    const sampleNamePart = keyNameParts[2].split('|');
    const subjectNamePart = sampleNamePart[0];
    const aspectNamePart = sampleNamePart[1];

    subAspMapSet.add(subAspPrefix + subjectNamePart);
    aspSubMapSet.add(aspSubPrefix + aspectNamePart);
  });

  return [Array.from(subAspMapSet), Array.from(aspSubMapSet)];
} // getResourceMapsKeys

/**
 * Gets the value of "previousStatusKey"
 *
 * @returns {Promise} which resolves to the value of the previoiusStatusKey
 */
async function getPreviousStatus(redisClient) {
  return await redisClient.get(constants.previousStatusKey);
} // persistInProgress

/**
 * Clear all the "sampleStore" keys (for subjects, aspects, samples, subaspmap,
 *  aspsubmap)
 * from redis.
 *
 * @returns {Promise} upon completion.
 */
async function eradicate(redisClient) {
  const promises = Object.getOwnPropertyNames(constants.indexKey)
    .map(async (s) => {
      try {
        const keys = await redisClient.sMembers(constants.indexKey[s]);
        if (constants.indexKey[s] === constants.indexKey.sample) {
          /**
           * this is done to delete keys prefixed with "samsto:subaspmap:" and
           * "samsto:aspsubmap:"
           */
          keys.push(...getResourceMapsKeys(keys)[ZERO]);
          keys.push(...getResourceMapsKeys(keys)[ONE]);
        }

        if (constants.indexKey[s] === constants.indexKey.aspect) {
          /**
           * delete aspect tags/writers/ranges keys
           */
          keys.forEach((key) => {
            const aspName = key.split(constants.separator)[2];
            keys.push(samsto.toKey(constants.objectType.aspTags, aspName));
            keys.push(samsto.toKey(constants.objectType.aspWriters, aspName));
            keys.push(samsto.toKey(constants.objectType.aspRanges, aspName));
            keys.push(samsto.toKey(constants.objectType.aspExists, aspName));
          });
        }

        if (constants.indexKey[s] === constants.indexKey.subject) {
          /**
           * delete subject tags/writers/ranges keys
           */
          keys.forEach((key) => {
            const subName = key.split(constants.separator)[2];
            keys.push(samsto.toKey(constants.objectType.subTags, subName));
            keys.push(samsto.toKey(constants.objectType.subExists, subName));
          });
        }

        keys.push(constants.indexKey[s]);
        return await redisClient.del(keys);
      } catch (err) {
        // NO-OP
        logger.error(err); // eslint-disable-line
        return Promise.resolve(true);
      }
    });

  return await deletePreviousStatus()
    .then(() => Promise.all(promises))
    .then(() => {
      if (infoLoggingEnabled) {
        logger.info('Sample Store eradicated from cache :D');
      }

      return true;
    });
} // eradicate

/**
 * Populate the redis sample store with aspects from the db. If the aspect
 * has any writers, add them to the aspect's writers field
 *
 * @returns {Promise} which resolves to the list of redis batch responses.
 */
async function populateAspects() {
  const allAspects = await Aspect.scope('writers').findAll();

  if (infoLoggingEnabled) {
    const msg = `Starting to load ${allAspects.length} aspects to cache :|`;
    logger.info(msg);
  }

  return redisOps.batchCmds()
  .map(allAspects, (batch, asp) => {
    asp.dataValues.writers = asp.dataValues.writers.map(w => w.name);
    return batch
    .setupKeysForAspect(asp)
    .setHash(constants.objectType.aspect, asp.name, asp)
    .addKeyToIndex(constants.objectType.aspect, asp.name);
  })
  .exec()

  .then(() => {
    if (infoLoggingEnabled) {
      logger.info('Done loading aspects to cache :D');
    }

    return true;
  });
} // populateAspects

/**
 * Populate the redis subjects store with subjects from the db.
 *
 * @returns {Promise} which resolves to the list of redis batch responses.
 */
async function populateSubjects() {
  const subjects = await Subject.findAll();

  if (infoLoggingEnabled) {
    const msg = `Starting to load ${subjects.length} subjects to cache :|`;
    logger.info(msg);
  }

  return redisOps.batchCmds()
  .map(subjects, (batch, sub) =>
    batch
    .setupKeysForSubject(sub)
    .addKeyToIndex(constants.objectType.subject, sub.absolutePath)
    .setHash(constants.objectType.subject, sub.absolutePath, sub)
  )
  .exec()

  .then(() => {
    if (infoLoggingEnabled) {
      logger.info('Done loading subjects to cache :D');
    }

    return true;
  });
} // populateSubjects

/**
 * Populate the redis sample store with samples from the db.
 * Creates subjectAbspath to aspectMapping and sample to sampleObject Mapping
 * @returns {Promise} which resolves to the list of redis batch responses.
 */
async function populateSamples(redisClient) {
  const samples = await Sample.findAll();

  if (infoLoggingEnabled) {
    const msg = `Starting to load ${samples.length} samples to cache :|`;
    logger.info(msg);
  }

  const sampleIdx = new Set();
  const subjectSets = {};
  const aspectResourceMaps = {};
  const sampleHashes = {};
  samples.forEach((s) => {
    const nameParts = s.name.split('|');

    // Generate the redis keys for this aspect, sample and subject.
    const aspName = nameParts[ONE].toLowerCase();
    const subjAbsPath = nameParts[ZERO].toLowerCase();

    const samKey = samsto.toKey(constants.objectType.sample, s.name);
    const subAspMapKey = samsto.toKey(
      constants.objectType.subAspMap, subjAbsPath
    );
    const aspSubMapKey = samsto.toKey(
      constants.objectType.aspSubMap, aspName
    );

    // Track each of these in the master indexes for each object type.
    sampleIdx.add(samKey);

    /*
      * For creating each individual subject set, which is a mapping of
      * subject absolutepath and a list aspects
      */
    if (subjectSets.hasOwnProperty(subAspMapKey)) {
      subjectSets[subAspMapKey].push(aspName);
    } else {
      subjectSets[subAspMapKey] = [aspName];
    }

    /*
      * Create aspect-to-subject resource map - a mapping of aspect and a list of
      * subjects for corresponding samples
      */
    if (aspectResourceMaps.hasOwnProperty(aspSubMapKey)) {
      aspectResourceMaps[aspSubMapKey].push(subjAbsPath);
    } else {
      aspectResourceMaps[aspSubMapKey] = [subjAbsPath];
    }

    // For creating each individual sample hash...
    sampleHashes[samKey] = samsto.cleanSample(s);
  });

  // Batch of commands to create the master sample and subject indexes...
  const indexCmds = [
    ['sadd', constants.indexKey.sample, Array.from(sampleIdx)],
  ];
  const batchPromises = [redisClient.multi(indexCmds).exec()];

  // Batch of commands to create each individal subject set...
  const subjectCmds = Object.keys(subjectSets)
    .map((key) => ['sadd', key, subjectSets[key]]);
  batchPromises.push(redisClient.multi(subjectCmds).exec());

  // Batch of commands to create each individal aspect resource map...
  const aspectResouceMapCmds = Object.keys(aspectResourceMaps)
    .map((key) => ['sadd', key, aspectResourceMaps[key]]);
  batchPromises.push(redisClient.multi(aspectResouceMapCmds).exec());

  // Batch of commands to create each individal sample hash...
  const sampleCmds = Object.keys(sampleHashes)
    .map((key) => {
      logInvalidHmsetValues(key, sampleHashes[key]);
      return ['hmset', key, sampleHashes[key]];
    });
  batchPromises.push(redisClient.multi(sampleCmds).exec());

  // Return once all batches have completed.
  return Promise.all(batchPromises)
    .then(() => {
      if (infoLoggingEnabled) {
        logger.info('Done loading samples to cache :D');
      }

      return true;
    });
} // populateSamples

/**
 * Populate the redis sample store from the db.
 *
 * @returns {Promise} which resolves to the list of redis batch responses, or
 *  false if the feature is not enabled.
 */
async function populate(redisClient) {
  if (infoLoggingEnabled) {
    const msg = 'Populating redis sample store from db started :|';
    logger.info(msg);
  }

  let resp;
  const promises = [populateSubjects(), populateAspects()];
  return Promise.all(promises)
    .then((retval) => {
      resp = retval;
      return populateSamples(redisClient);
    })
    .then((sampresp) => {
      resp.push(sampresp);
      return resp;
    });
} // populate

/**
 *
 * Compare the current status of the "enableRedisSampleStore" flag with its
 * previous status. If both current status and previous status are the same, do
 * nothing. When the current status and the previous status do not match, take
 * some action depending on the current status.
 *
 * @returns {Promise} which resolves to true if the sample store already
 *  exists.
 */
async function storeSampleToCacheOrDb(redisClient) {
  const currentStatus = featureToggles.isFeatureEnabled(constants.featureName)
    || false;
  console.log('\n \n storeSampleToCacheOrDb', currentStatus);
  const prevState = await getPreviousStatus();
  const previousStatus = (prevState == 'true') || false;

  console.log('\n\npreviousStatus', previousStatus);
  // set the previousStatus to the currentStatus
  await redisClient.set(constants.previousStatusKey, currentStatus);

  /*
    * when the current status and the previous status do not match, actions
    * needs to be taken based on the current status
  */
  if (previousStatus !== currentStatus) {

    /*
      * call "popluate" when "enableRedisSampleStore" flag has been changed
      * from false to true. Call "eradicate" and "storeSampleToDb" when
      * "enableRedisSampleStore" flag has been changed from true to false
      */
    if (currentStatus) {
      if (infoLoggingEnabled) {
        logger.info('"enableRedisSampleStore" flag was switched to true, so ' +
          'populating the cache from db');
      }

      return populate();
    }

    if (infoLoggingEnabled) {
      logger.info('"enableRedisSampleStore" flag was switched to false so ' +
        'so persisting to db from cache. The cache will be eradicated ' +
        'after the samples are persisted to db');
    }

    return samstoPersist.storeSampleToDb() // populate the sample table
      .then(() => eradicate(redisClient)); // eradicate the cache
  }

  // when the current status and previous status are same, resolve to false
  return false;
} // storeSampleToCacheOrDb

/**
 * Calls "storeSampleToCacheOrDb" to either populate the cache from db or db
 * from cache, depending on the change of state of the "enableRedisSampleStore"
 * flag
 *
 * @returns {Promise} which resolves to false if no action was taken or resolves
 * to a list of promises if some action was taken.
 */
async function init() {
  const redisCache = await redisCachePromise;
  const redisClient = redisCache.client.sampleStore;
  return await storeSampleToCacheOrDb(redisClient)
    .then((ret) => Promise.resolve(ret))
    .catch((err) => {
      // NO-OP
      logger.error(err);
      return Promise.resolve(false);
    });
} // init

module.exports = {
  eradicate,
  init,
  populate,
};
