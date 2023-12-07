/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/heartbeatUtils.js
 */
'use strict'; // eslint-disable-line strict

const redisCachePromise = require('../../../../cache/redisCache');
const ADDED = 'added';
const DELETED = 'deleted';
const UPDATED = 'updated';
const NOCHANGE = 0;

/**
 * Get the changes from redis for a given collector
 *
 * @param {String} collectorName - The collector name
 * @returns {Object} - An object with lists of added, deleted, and updated
 * generator ids
 */
function getChangedIds(collectorName) {
  return redisCachePromise
    .then(redisCache => {
      console.log("redisCache.client.heartbeat ==>>>>", redisCache.client.heartbeat);
      return redisCache.client.heartbeat.multi()
      .sMembers(getKey(collectorName, ADDED))
      .sMembers(getKey(collectorName, DELETED))
      .sMembers(getKey(collectorName, UPDATED))
      .exec()
      .then((replies) => ({
        added: replies[0],
        deleted: replies[1],
        updated: replies[2],
      }));
    })
    .catch(error => {
      console.error('Error using Redis client:', error);
    })
}

/**
 * Remove the generator from the specified change set
 *
 * @param {String} collectorName - The collector name
 * @param {String} change - The change type
 * @param {String} genId - The id of the generator to remove
 * @returns {Promise}
 */
function removeFromSet(collectorName, change, genId) {
  if (change === ADDED || change === DELETED || change === UPDATED) {
    const key = getKey(collectorName, change);
    return redisCachePromise
      .then(redisCache => {
        return redisCache.client.heartbeat.sRem(key, genId);
      })
      .catch(error => {
        console.error('Error using Redis client:', error);
      })
  } else {
    return Promise.resolve();
  }
}

/**
 * Add the generator to the specified change set
 *
 * @param {String} collectorName - The collector name
 * @param {String} change - The change type
 * @param {String} genId - The id of the generator to add
 * @returns {Promise}
 */
function addToSet(collectorName, change, genId) {
  if (change === ADDED || change === DELETED || change === UPDATED) {
    const key = getKey(collectorName, change);
    return redisCachePromise
      .then(redisCache => {
        return redisCache.client.heartbeat.sAdd(key, genId);
      })
      .catch(error => {
        console.error('Error using Redis client:', error);
      })
  } else {
    return Promise.resolve();
  }
}

/**
 * Reset all changes for this collector.
 *
 * @param {String} collectorName - The collector name
 * @returns {Promise}
 */
function resetChanges(collectorName) {
  const addedKey = getKey(collectorName, ADDED);
  const deletedKey = getKey(collectorName, DELETED);
  const updatedKey = getKey(collectorName, UPDATED);
  return redisCachePromise
    .then(redisCache => {
      return redisCache.client.heartbeat.del(addedKey, deletedKey, updatedKey);
    })
    .catch(error => {
      console.error('Error using Redis client:', error);
    })
}

/**
 * Generate the redis key
 *
 * @param {String} collectorName - The collector name
 * @param {String} changeType - The change type
 * @returns {String} - The redis key
 */
function getKey(collectorName, changeType) {
  return `heartbeat::generatorChanges::${collectorName}::${changeType}`;
}

/**
 * Track generator changes to be sent in the heartbeat response.
 * Maintain redis keys that map collector names to sets of
 * generators added, deleted, and updated since the last heartbeat from that
 * collector.
 *
 * @param {Object} generator - The Generator that has been changed
 * @param {Array} oldCollector - The name of the Collector this Generator was
 *  assigned to before the update.
 * @param {Array} newCollector - The name of the Collector this Generator is
 *  assigned to after the update.
 */
function trackGeneratorChanges(generator, oldCollectorName, newCollectorName) {
  if (oldCollectorName === newCollectorName) {
    return trackChangesForCollector(oldCollectorName, UPDATED, generator);
  } else {
    return Promise.all([
      trackChangesForCollector(oldCollectorName, DELETED, generator),
      trackChangesForCollector(newCollectorName, ADDED, generator),
    ]);
  }

  function trackChangesForCollector(collectorName, change, generator) {
    const genId = generator.id;
    if (!collectorName) return Promise.resolve();
    return getChangedIds(collectorName)
    .then((changedIds) => {

      // determine if this generator has already been changed since the last heartbeat
      const alreadyAdded = changedIds.added.includes(genId);
      const alreadyDeleted = changedIds.deleted.includes(genId);
      const alreadyUpdated = changedIds.updated.includes(genId);
      const alreadyChanged = alreadyAdded || alreadyDeleted || alreadyUpdated;

      // account for previous changes
      let undoChange;
      if (alreadyChanged) {
        if (alreadyAdded && change === DELETED) {
          undoChange = ADDED;
          change = NOCHANGE;
        } else if (alreadyDeleted && change === ADDED) {
          undoChange = DELETED;
          change = UPDATED;
        } else if (alreadyUpdated && change === DELETED) {
          undoChange = UPDATED;
          change = DELETED;
        } else {
          change = NOCHANGE;
        }
      }

      // update redis
      return Promise.all([
        removeFromSet(collectorName, undoChange, genId),
        addToSet(collectorName, change, genId),
      ]);
    });
  }

} // trackGeneratorChanges

module.exports = {
  getChangedIds,
  resetChanges,
  trackGeneratorChanges,
};
