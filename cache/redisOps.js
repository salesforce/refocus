/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * cache/redisOps.js
 */
'use strict'; // eslint-disable-line strict

const redisStore = require('./sampleStore');
const redisClient = require('./redisCache').client.sampleStore;
const subjectType = redisStore.constants.objectType.subject;
const aspectType = redisStore.constants.objectType.aspect;
const sampleType = redisStore.constants.objectType.sample;

/**
 * Capitalize the first letter of the string and returns the modified string.
 *
 * @param  {String} str - String that has to have its first letter capitalized
 * @returns {String} str - String with the first letter capitalized
 */
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
} // capitalizeFirstLetter

/**
 * Creates or updates the hash specified by the name argument, with values
 * specified by the value argument.
 * @param  {String} objectName - Name of the object.
 * @param  {String} name  - Name used to identify the hash
 * @param  {Object} value - The value object's key/value are set as the
 * key/value of the hash that is created or updated.
 * @returns {Promise} - which resolves to true
 */
function hmSet(objectName, name, value) {
  const cleanobj =
          redisStore['clean' + capitalizeFirstLetter(objectName)](value);
  const nameKey = redisStore.toKey(objectName, name);
  return redisClient.hmsetAsync(nameKey, cleanobj)
  .then((ok) => Promise.resolve(ok))
  .catch((err) => Promise.reject(err));
} // hmSet

/**
 * Adds an entry identified by name to the master list of indices identified
 * by "type"
 * @param  {String} type - The type of the master list on which the
 *  set operations are to be performed
 * @param {String} name - Name of the key to be added
 * @returns {Promise} - which resolves to the values returned by the redis
 *  command
 */
function addKey(type, name) {
  const indexName = redisStore.constants.indexKey[type];
  const nameKey = redisStore.toKey(type, name);
  return redisClient.saddAsync(indexName, nameKey)
  .then((ok) => Promise.resolve(ok))
  .catch((err) => Promise.reject(err));
} // addKey

/**
 * Deletes an entry from the master list of indices identified by "type" and
 * and the corresponding set identified by "name". Use this to delete a single
 * key from the subjectStore, aspectStore or SampleStore.
 * @param  {String} type - The type of the master list on which the
 *  set operations are to be performed
 * @param {String} name - Name of the key to be added
 * @returns {Promise} - which resolves to the values returned by the redis
 * batch command
 */
function deleteKey(type, name) {
  const indexName = redisStore.constants.indexKey[type];
  const key = redisStore.toKey(type, name);
  const cmds = [];

  // remove the entry from the master index of type
  cmds.push(['srem', indexName, key]);

  // delete the set
  cmds.push(['del', key]);
  return redisClient.batch(cmds).execAsync()
  .then((ret) => Promise.resolve(ret))
  .catch((err) => Promise.reject(err));
} // deleteKey

/**
 * Deletes entries from the sampleStore that matches the "subject name" part
 * or the "aspect name" part of the entry. The hash identified by the
 * deleted entry is also deleted. Use this only to delete multiple keys in the
 * sampleStore and its related hashes.
 * @param  {String} type - The type of the master list on which the
 *  set operations are to be performed
 * @param  {String} objectName - The object name (like Subject, Aspect, Sample)
 * @param {String} name - Name of the key to be deleted
 * @returns {Promise} - which resolves to the values returned by the redis batch
 * command
 */
function deleteKeys(type, objectName, name) {
  if (type !== sampleType) {
    return Promise.reject(false);
  }

  const nameKey = redisStore.toKey(type, name);
  const indexName = redisStore.constants.indexKey[type];
  const cmds = [];
  return redisClient.smembersAsync(indexName)
  .then((keys) => {
    const keyArr = [];

    /*
     * Go through the members in the SampleStore. Split the name parts. If
     * the object type is subject and the "subjectNamepart" matches the nameKey
     * remove it from the SampleStore. There is also a hash with the same name
     * as this, delete that hash too. If the object type is aspect and the
     * and aspect name matches the name, remove it from the sampleStore and
     * delete the hash.
     */
    keys.forEach((key) => {
      const nameParts = key.split('|');
      const subjectKey = nameParts[0];
      const aspect = nameParts[1];
      if ((objectName.toLowerCase() === subjectType && nameKey === subjectKey)
        || (objectName.toLowerCase() === aspectType && name === aspect)) {
        keyArr.push(key);
      }
    });

    // remove the entry from the master list of index
    cmds.push(['srem', indexName, Array.from(keyArr)]);

    // delete the set too
    cmds.push(['del', Array.from(keyArr)]);
    return redisClient.batch(cmds).execAsync();
  })
  .then((ret) => Promise.resolve(ret))
  .catch((err) => Promise.reject(err));
} // deleteKeys

/**
 * Renames the entry in subject or aspect master list and the corresponding
 * hash identified by the entry. Use this to handle the subject store and aspect
 * store entries and its corresponding hashes.
 * @param  {String} type - The type of the master list on which the
 *  set operations are to be performed
 * @param  {String} oldName - The old key name
 * @param  {String} newName - The new key name
 * @returns {Promise} - which resolves to the values returned by the redis batch
 * command
 */
function renameKey(type, oldName, newName) {
  const newKey = redisStore.toKey(type, newName);
  const oldKey = redisStore.toKey(type, oldName);
  const indexName = redisStore.constants.indexKey[type];
  const cmds = [];

  // remove the old key from the master list of index
  cmds.push(['srem', indexName, oldKey]);

  // add the new key to the master list of index
  cmds.push(['sadd', indexName, newKey]);

  // rename the set with the new name
  cmds.push(['rename', oldKey, newKey]);
  return redisClient.batch(cmds).execAsync()
        .then((ret) => Promise.resolve(ret))
        .catch((err) => Promise.reject(err));
} // renameKey

/**
 * Renames the entries in the sample master list and the corresponding hashes
 * identified by the entries.
 * @param  {String} type - The type of the master list on which the
 * set operations are to be performed
 * @param  {String} objectName - The object name (like Subject, Aspect, Sample)
 * @param  {String} oldName - The old key name
 * @param  {String} newName - The new key name
 * @returns {Promise} - which resolves to the values returned by the redis batch
 * command
 */
function renameKeys(type, objectName, oldName, newName) {
  if (type !== sampleType) {
    return Promise.reject(false);
  }

  const indexName = redisStore.constants.indexKey[type];
  const oldKey = redisStore.toKey(type, oldName);
  const newKey = redisStore.toKey(type, newName);
  const cmds = [];
  return redisClient.smembersAsync(indexName)
  .then((keys) => {
    const finalNewKeyArr = [];
    const finalOldKeyArr = [];

    /*
     * For each key in the sampleStore, split the key into subjectKey and aspect
     * (calling it subjectKey because the subject has redis namespace prefixed
     * to it ). If the subjectKey matches the oldKey and the objectName is
     * subject, add the key to finalOldKeyArr to be removed later and
     * add create a finalNewKey(sample key) using the newKey and the aspect name
     * obtained after spliting the key. Add the finalNewKey to
     * a finalNewKeyArr to be aded to the sampleStore later. Also, rename the
     * set that corresponds to the key to finalNewKey. The same is done when
     * the oldName matches the aspect name obtained from splitting the key and
     * the objectName is aspect, expect the finaNewKey is created using the
     * subjectKey from spiliting the key and the newName.
     */
    keys.forEach((key) => {
      const nameParts = key.split('|');
      const subjectKey = nameParts[0];
      const aspect = nameParts[1];
      let finalNewKey;
      if (oldKey === subjectKey &&
        objectName.toLowerCase() === redisStore.constants.objectType.subject) {
        finalNewKey = newKey + '|' + aspect;
        finalNewKeyArr.push(finalNewKey);
        finalOldKeyArr.push(key);
        cmds.push(['rename', key, finalNewKey]);
      } else if (oldName === aspect &&
        objectName.toLowerCase() === redisStore.constants.objectType.aspect) {
        finalNewKey = subjectKey + '|' + newName;
        finalNewKeyArr.push(finalNewKey);
        finalOldKeyArr.push(key);
        cmds.push(['rename', key, finalNewKey]);
      }
    });

    // remove the old key from the master list of index
    cmds.push(['srem', indexName, Array.from(finalOldKeyArr)]);

    // add the new key to the master list of index
    cmds.push(['sadd', indexName, Array.from(finalNewKeyArr)]);

    return redisClient.batch(cmds).execAsync();
  })
  .then((ret) => Promise.resolve(ret))
  .catch((err) => Promise.reject(err));
} // renameKeys

module.exports = {
  renameKey,

  renameKeys,

  deleteKey,

  deleteKeys,

  addKey,

  hmSet,

  subjectType,

  aspectType,

  sampleType,
}; // export
