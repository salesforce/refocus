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

const collectorMap = {};
const propsToSend = [
  'aspects', 'collectors', 'connection', 'context',
  'description', 'generatorTemplate', 'helpEmail', 'helpUrl', 'id', 'name',
  'subjectQuery', 'subjects', 'tags',
];
const ADDED = 1;
const DELETED = 2;
const UPDATED = 3;
const NOCHANGE = 4;

/**
 * Track generator changes to be sent in the heartbeat response.
 * Maintain collectorMap such that it always maps collector names to lists of
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
  const gen = generator.get ? generator.get() : generator;
  generator = {};
  propsToSend.forEach(key => generator[key] = gen[key]);
  const allCollectors = new Set([...oldCollectors, ...newCollectors]);
  allCollectors.forEach((collectorName) => {

    //make sure the generator object is unique for each collector
    generator = JSON.parse(JSON.stringify(generator));

    //initialize the collectorMap for this collector
    if (!collectorMap[collectorName]) {
      collectorMap[collectorName] = {
        added: [],
        deleted: [],
        updated: [],
      };
    }

    //determine the change type
    let change;
    const inOld = oldCollectors.includes(collectorName);
    const inNew = newCollectors.includes(collectorName);
    if (inOld && !inNew) change = DELETED;
    if (!inOld && inNew) change = ADDED;
    if (inOld && inNew) change = UPDATED;

    //determine if this generator has already been changed since the last heartbeat
    const addedGenerators = collectorMap[collectorName].added;
    const deletedGenerators = collectorMap[collectorName].deleted;
    const updatedGenerators = collectorMap[collectorName].updated;
    const alreadyAdded = addedGenerators.find((g) => g.id === generator.id);
    const alreadyDeleted = deletedGenerators.find((g) => g.id === generator.id);
    const alreadyUpdated = updatedGenerators.find((g) => g.id === generator.id);
    const alreadyChanged = alreadyAdded || alreadyDeleted || alreadyUpdated;

    //reset the change map to account for previous changes
    if (alreadyChanged) {
      if (alreadyAdded && change === DELETED) {
        removeFromList(addedGenerators);
        change = NOCHANGE;
      } else if (alreadyDeleted && change === ADDED) {
        removeFromList(deletedGenerators);
        change = UPDATED;
      } else if (alreadyUpdated && change === DELETED) {
        removeFromList(updatedGenerators);
        change = DELETED;
      } else {
        change = NOCHANGE;
      }
    }

    //update collectorMap based on the change type
    if (change === ADDED) {
      addedGenerators.push(generator);
    } else if (change === DELETED) {
      deletedGenerators.push(generator);
    } else if (change === UPDATED) {
      updatedGenerators.push(generator);
    }

  });

  function removeFromList(list) {
    const index = list.findIndex((g) => g.id === generator.id);
    if (index !== -1) list.splice(index, 1);
  }

} // trackGeneratorChanges

module.exports = {
  collectorMap,
  trackGeneratorChanges,
};
