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
const log = require('winston');
const samstoPersist = require('./sampleStorePersist');
const constants = samsto.constants;

/**
 * Deletes the previousStatuskey (that stores the previous value of the
 * "enableRedisSampleStore" flag).
 * @returns {Promise} - which resolves to 0 when the key is deleted.
 */
function deletePreviousStatus() {
  return redisClient.delAsync(constants.previousStatusKey);
} // deletePreviousStatus

/**
 * When passed an array of sample keys, it extracts the subject name part from
 * each of the key and returns an array of keys prefixed with
 * "samsto:subaspmap". For example if
 * ['samsto:sample:subject1|aspect1','samsto:sample:subject2|aspect2']
 * is the input, the output is
 *['samsto:subaspmap:subject1','samsto:subaspmap:subject2']
 * @param  {Array} keys - An array of sample keys
 * @returns {Array} - An array of subaspmap keys
 */
function getSubAspMapKeys(keys) {
  const subAspMapSet = new Set();
  const subAspPrefix = constants.prefix + constants.separator +
    constants.objectType.subAspMap + constants.separator;
  keys.forEach((key) => {
    const keyNameParts = key.split(constants.separator);
    const sampleNamePart = keyNameParts[2].split('|');
    const subjectNamePart = sampleNamePart[0];
    subAspMapSet.add(subAspPrefix + subjectNamePart);
  });
  return Array.from(subAspMapSet);
} // getSubAspMapKeys

/**
 * Gets the value of "previousStatusKey"
 *
 * @returns {Promise} which resolves to the value of the previoiusStatusKey
 */
function getPreviousStatus() {
  return redisClient.getAsync(constants.previousStatusKey);
} // persistInProgress

/**
 * Clear all the "sampleStore" keys (for subjects, aspects, samples, subaspmap)
 * from redis.
 *
 * @returns {Promise} upon completion.
 */
function eradicate() {
  const promises = Object.getOwnPropertyNames(constants.indexKey)
    .map((s) => redisClient.smembersAsync(constants.indexKey[s])
    .then((keys) => {
      if (constants.indexKey[s] === constants.indexKey.sample) {
        // this is done to delete keys prefixed with "samsto:subaspmap:"
        keys.push(...getSubAspMapKeys(keys));
      }

      keys.push(constants.indexKey[s]);
      return redisClient.delAsync(keys);
    })
    .catch((err) => {
      // NO-OP
      console.error(err); // eslint-disable-line no-console
      Promise.resolve(true);
    }));
  return deletePreviousStatus()
    .then(() => Promise.all(promises))
    .then(() => log.info('Sample Store eradicated from cache :D'))
    .then(() => true);
} // eradicate

/**
 * Populate the redis sample store with aspects from the db. If the aspect
 * has any writers, add them to the aspect's writers field
 *
 * @returns {Promise} which resolves to the list of redis batch responses.
 */
function populateAspects() {
  let aspects;
  return Aspect.findAll({
    where: {
      isPublished: true,
    },
  })
  .then((allAspects) => {
    const msg = `Starting to load ${allAspects.length} aspects to cache :|`;
    log.info(msg);
    aspects = allAspects;
    const getWritersPromises = [];

    // get Writers for all the aspects in the aspect table
    aspects.forEach((aspect) => {
      getWritersPromises.push(aspect.getWriters());
    });
    return Promise.all(getWritersPromises);
  })
  .then((writersArray) => {
    const aspectIdx = [];
    const cmds = [];

    // for each aspect, add the associated writers to its "writers" field.
    for (let i = 0; i < aspects.length; i++) {
      const a = aspects[i];
      a.dataValues.writers = [];
      writersArray[i].forEach((writer) => {
        a.dataValues.writers.push(writer.dataValues.name);
      });
      const key = samsto.toKey(constants.objectType.aspect, a.name);
      aspectIdx.push(key);
      cmds.push(['hmset', key, samsto.cleanAspect(a)]);
    }

    cmds.push(['sadd', constants.indexKey.aspect, aspectIdx]);
    return redisClient.batch(cmds).execAsync()
      .then(() => log.info('Done loading aspects to cache :D'))
      .then(() => true);
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
    const msg = `Starting to load ${subjects.length} subjects to cache :|`;
    log.info(msg);
    const cmds = [];
    subjects.forEach((s) => {
      const key = samsto.toKey(constants.objectType.subject, s.absolutePath);

      // add the subject absoluePath to the master subject index
      cmds.push(['sadd', constants.indexKey.subject, key]);

      // create a mapping of subject absolutePath to subject object
      cmds.push(['hmset', key, samsto.cleanSubject(s)]);
    });

    return redisClient.batch(cmds).execAsync()
      .then(() => log.info('Done loading subjects to cache :D'))
      .then(() => true);
  })
  .catch(console.error); // eslint-disable-line no-console
} // populateSubjects

/**
 * Populate the redis sample store with samples from the db.
 * Creates subjectAbspath to aspectMapping and sample to sampleObject Mapping
 * @returns {Promise} which resolves to the list of redis batch responses.
 */
function populateSamples() {
  return Sample.findAll()
  .then((samples) => {
    const msg = `Starting to load ${samples.length} samples to cache :|`;
    log.info(msg);
    const subjectIdx = new Set();
    const sampleIdx = new Set();
    const subjectSets = {};
    const sampleHashes = {};
    samples.forEach((s) => {
      const nameParts = s.name.split('|');

      // Generate the redis keys for this aspect, sample and subject.
      const aspName = nameParts[1] // eslint-disable-line no-magic-numbers
        .toLowerCase();
      const samKey = samsto.toKey(constants.objectType.sample, s.name);
      const subAspMapKey = samsto.toKey(constants.objectType.subAspMap,
        nameParts[0]); // eslint-disable-line no-magic-numbers

      // Track each of these in the master indexes for each object type.
      sampleIdx.add(samKey);
      subjectIdx.add(subAspMapKey);

      /*
       * For creating each individual subject set, which is a mapping of
       * subject absolutepath and a list aspects
       */
      if (subjectSets.hasOwnProperty(subAspMapKey)) {
        subjectSets[subAspMapKey].push(aspName);
      } else {
        subjectSets[subAspMapKey] = [aspName];
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
      .map((key) => ['sadd', key, subjectSets[key]]);
    batchPromises.push(redisClient.batch(subjectCmds).execAsync());

    // Batch of commands to create each individal sample hash...
    const sampleCmds = Object.keys(sampleHashes)
      .map((key) => ['hmset', key, sampleHashes[key]]);
    batchPromises.push(redisClient.batch(sampleCmds).execAsync());

    // Return once all batches have completed.
    return Promise.all(batchPromises)
      .then(() => log.info('Done loading samples to cache :D'))
      .then(() => true);
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
  const msg = 'Populating redis sample store from db started :|';
  log.info(msg);
  let resp;
  const promises = [populateSubjects(), populateAspects()];
  return Promise.all(promises)
  .then((retval) => {
    resp = retval;
    return populateSamples();
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
        log.info('"enableRedisSampleStore" flag was switched to true,' +
          ' so populating the cache from db');
        return populate();
      }

      log.info('"enableRedisSampleStore" flag was switched to false' +
          ' so persisting to db from cache. The cache will be eradicated ' +
          'after the samples are persisted to db');
      return samstoPersist.storeSampleToDb() // populate the sample table
        .then(() => eradicate()); // eradicate the cache
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
