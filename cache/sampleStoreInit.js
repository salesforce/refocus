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
const redisClient = require('./redisCache').client.sampleStore;
const samsto = require('./sampleStore');
const winston = require('winston');
const samstoPersist = require('./sampleStorePersist');
const constants = samsto.constants;

/**
 * Deletes the key that does the previous value of the "enableRedisSampleStore"
 * flag.
 * @returns {Promise} - which resolves to 0 when the key is deleted.
 */
function deletePreviousStatus() {
  return redisClient.delAsync(constants.previousStatusKey);
} // deletePreviousStatus

/**
 * Gets the value of "previousStatusKey"
 *
 * @returns {Promise} which resolves to the value of the previoiusStatusKey
 */
function getPreviousStatus() {
  return redisClient.getAsync(constants.previousStatusKey);
} // persistInProgress

/**
 * Clear all the "sampleStore" keys (for subjects, aspects, samples) from
 * redis.
 *
 * @returns {Promise} upon completion.
 */
function eradicate() {
  const promises = Object.getOwnPropertyNames(constants.indexKey)
    .map((s) => redisClient.smembersAsync(constants.indexKey[s])
    .then((keys) => {
      keys.push(constants.indexKey[s]);
      return redisClient.delAsync(keys);
    })
    .catch((err) => {
      // NO-OP
      console.error(err); // eslint-disable-line no-console
      Promise.resolve(true);
    }));
  return deletePreviousStatus()
    .then(() => Promise.all(promises));
} // eradicate

/**
 * Populate the redis sample store with aspects from the db.
 *
 * @returns {Promise} which resolves to the list of redis batch responses.
 */
function populateAspects() {
  return Aspect.findAll({
    where: {
      isPublished: true,
    },
  })
  .then((aspects) => {
    const aspectIdx = [];
    const cmds = [];
    aspects.forEach((a) => {
      const key = samsto.toKey(constants.objectType.aspect, a.name);
      aspectIdx.push(key);
      cmds.push(['hmset', key, samsto.cleanAspect(a)]);
    });

    cmds.push(['sadd', constants.indexKey.aspect, aspectIdx]);
    return redisClient.batch(cmds).execAsync();
  })
  .catch(console.error); // eslint-disable-line no-console
} // populateAspects

/**
 * Populate the redis subjects store with subjects from the db.
 *
 * @returns {Promise} which resolves to the list of redis batch responses.
 */
function populateSubjects() {
  return Subject.findAll({ where: { isPublished: true } })
  .then((subjects) => {
    const cmds = [];
    subjects.forEach((s) => {
      const key = samsto.toKey(constants.objectType.subject, s.absolutePath);
      cmds.push(['hmset', key, { subjectId: s.id }]);
      cmds.push(['sadd', constants.indexKey.subject, key]);
    });

    return redisClient.batch(cmds).execAsync();
  })
  .catch(console.error); // eslint-disable-line no-console
} // populateSubjects

/**
 * Populate the redis sample store with samples from the db.
 *
 * @returns {Promise} which resolves to the list of redis batch responses.
 */
function populateSamples() {
  return Sample.findAll()
  .then((samples) => {
    const sampleIdx = new Set();
    const subjectSets = {};
    const sampleHashes = {};

    samples.forEach((s) => {
      const nameParts = s.name.split('|');

      // Generate the redis keys for this aspect, sample and subject.
      const aspName = nameParts[1] // eslint-disable-line no-magic-numbers
        .toLowerCase();
      const samKey = samsto.toKey(constants.objectType.sample, s.name);
      const subKey = samsto.toKey(constants.objectType.subject,
        nameParts[0]); // eslint-disable-line no-magic-numbers

      // Track each of these in the master indexes for each object type.
      sampleIdx.add(samKey);

      // For creating each individual subject set...
      if (!subjectSets.hasOwnProperty(subKey)) {
        subjectSets[subKey] = {
          subjectId: s.subjectId,
          aspectNames: [aspName],
        };
      } else { // has key
        if (subjectSets[subKey].aspectNames) {
          subjectSets[subKey].aspectNames.push(aspName);
        } else {
          subjectSets[subKey].aspectNames = [aspName];
        }
      }

      // For creating each individual sample hash...
      sampleHashes[samKey] = samsto.cleanSample(s);
    });

    // Batch of commands to create the master sample and subject indexes...
    const indexCmds = [
      ['sadd', constants.indexKey.sample, Array.from(sampleIdx)],
    ];
    const batchPromises = [redisClient.batch(indexCmds).execAsync()];

    // Batch of commands to create each individal subject set...
    const subjectCmds = Object.keys(subjectSets)
      .map((key) => ['hmset', key, samsto.cleanSubject(subjectSets[key])]);
    batchPromises.push(redisClient.batch(subjectCmds).execAsync());

    // Batch of commands to create each individal sample hash...
    const sampleCmds = Object.keys(sampleHashes)
      .map((key) => ['hmset', key, sampleHashes[key]]);
    batchPromises.push(redisClient.batch(sampleCmds).execAsync());

    // Return once all batches have completed.
    return Promise.all(batchPromises);
  })
  .catch(console.error); // eslint-disable-line no-console
} // populateSamples

/**
 * Populate the redis sample store from the db.
 *
 * @returns {Promise} which resolves to the list of redis batch responses, or
 *  false if the feature is not enabled.
 */
function populate() {
  const msg = 'Populating redis sample store from db';
  winston.info(msg);

  const promises = [populateSubjects(), populateSamples(), populateAspects()];
  return Promise.all(promises);
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
function storeSampleToCacheOrDb() {
  const currentStatus = featureToggles.isFeatureEnabled(constants.featureName)
                                          || false;
  return getPreviousStatus()
  .then((prevState) => {
    const previousStatus = (prevState == 'true') || false;

    // set the previousStatus to the currentStatus
    redisClient.setAsync(constants.previousStatusKey, currentStatus);

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
        return populate();
      }

      /*
       * If samples are being persisted to the db by some other process, STOP
       * and resolve to false.
       */
      return samstoPersist.persistInProgress()
      .then((inProgress) => {
        if (inProgress) {
          return Promise.resolve(false);
        }

        return samstoPersist.storeSampleToDb();
      }).then(() => eradicate()); // eradicate the cache
    }

    // when the current status and previous status are same, resolve to false
    return Promise.resolve(false);
  });
} // storeSampleToCacheOrDb

/**
 * Calls "storeSampleToCacheOrDb" to either populate the cache from db or db
 * from cache, depending on the change of state of the "enableRedisSampleStore"
 * flag
 *
 * @returns {Promise} which resolves to false if no action was taken or resolves
 * to a list of promises if some action was taken.
 */
function init() {
  return storeSampleToCacheOrDb()
  .then((ret) => Promise.resolve(ret))
  .catch((err) => {
    // NO-OP
    console.error(err); // eslint-disable-line no-console
    Promise.resolve(false);
  });
} // init

module.exports = {
  eradicate,
  init,
  populate,
};
