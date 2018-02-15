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

const redisClient = require('../../../../cache/redisCache').client.heartbeat;
const ADDED = 'added';
const DELETED = 'deleted';
const UPDATED = 'updated';
const NOCHANGE = 0;

/**
 * Track generator changes to be sent in the heartbeat response.
 * Maintain redis keys that map collector names to sets of
 * generators added, deleted, and updated since the last heartbeat from that
 * collector.
 *
 * @param {Object} generator - The Generator that has been changed
 * @param {Array} oldCollectors - The names of the collectors that were associated
 *  with this generator before the update.
 * @param {Array} newCollectors - The names of the collectors that are associated
 *  with this generator now, after the update has been applied.
 */
function trackGeneratorChanges(generator, oldCollectors, newCollectors) {
  const genId = generator.id;
  const allCollectors = Array.from(new Set([...oldCollectors, ...newCollectors]));

  Promise.all(allCollectors.map(name => getChangedIds(name)))
  .then((collectorChanges) => {
    let promises = [];
    collectorChanges.forEach((changedIds, i) => {
      const collectorName = allCollectors[i];

      // determine the change type
      let change;
      const inOld = oldCollectors.includes(collectorName);
      const inNew = newCollectors.includes(collectorName);
      if (inOld && !inNew) change = DELETED;
      if (!inOld && inNew) change = ADDED;
      if (inOld && inNew) change = UPDATED;

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
      promises.push(removeFromSet(collectorName, undoChange, genId));
      promises.push(addToSet(collectorName, change, genId));
    });

    return Promise.all(promises);
  });
} // trackGeneratorChanges

function getChangedIds(collectorName) {
  return new Promise((resolve, reject) =>
    redisClient.multi()
    .smembers(getKey(collectorName, ADDED))
    .smembers(getKey(collectorName, DELETED))
    .smembers(getKey(collectorName, UPDATED))
    .exec((err, replies) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          added: replies[0],
          deleted: replies[1],
          updated: replies[2],
        });
      }
    })
  );
}

function removeFromSet(collectorName, change, genId) {
  if (change === ADDED || change === DELETED || change === UPDATED) {
    const key = getKey(collectorName, change);
    return redisClient.sremAsync(key, genId);
  } else {
    return Promise.resolve();
  }
}

function addToSet(collectorName, change, genId) {
  if (change === ADDED || change === DELETED || change === UPDATED) {
    const key = getKey(collectorName, change);
    return redisClient.saddAsync(key, genId);
  } else {
    return Promise.resolve();
  }
}

function resetChanges(collectorName) {
  const addedKey = getKey(collectorName, ADDED);
  const deletedKey = getKey(collectorName, DELETED);
  const updatedKey = getKey(collectorName, UPDATED);
  return redisClient.delAsync(addedKey, deletedKey, updatedKey);
}

function getKey(collectorName, changeType) {
  return `heartbeat::generatorChanges::${collectorName}::${changeType}`;
}

module.exports = {
  trackGeneratorChanges,
  getChangedIds,
  resetChanges,
};
