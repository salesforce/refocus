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
const logInvalidHmsetValues = require('../utils/common').logInvalidHmsetValues;
const redisClient = require('./redisCache').client.sampleStore;
const rsConstant = redisStore.constants;
const subjectType = redisStore.constants.objectType.subject;
const subAspMapType = redisStore.constants.objectType.subAspMap;
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
  logInvalidHmsetValues(nameKey, cleanobj);
  return redisClient.hmsetAsync(nameKey, cleanobj)
  .then((ok) => Promise.resolve(ok))
  .catch((err) => Promise.reject(err));
} // hmSet

/**
 * Sets the value of the hash specified by the name argument.
 * @param  {String} objectName - Name of the object.
 * @param  {String} name  - Name used to identify the hash
 * @param  {Object} value - The value object's key/value are set as the
 * key/value of the hash that is created or updated.
 * @returns {Promise} - which resolves to true
 */
function setValue(objectName, name, value) {
  const nameKey = redisStore.toKey(objectName, name);
  return redisClient.setAsync(nameKey, value)
  .then((ok) => Promise.resolve(ok))
  .catch((err) => Promise.reject(err));
} // setValue

/**
 * Promise to get complete hash
 * @param  {String} type - Object type
 * @param  {String} name - Object name
 * @returns {Promise} - Resolves to object
 */
function getHashPromise(type, name) {
  return redisClient.hgetallAsync(redisStore.toKey(type, name));
} // getHashPromise

/**
 * Get the value that is mapped to a key
 * @param  {String} type - The type of the object on which the operation is to
 * be performed
 * @param  {String} name -  Name of the key
 * @returns {Promise} - which resolves to the value associated with the key
 */
function getValue(type, name) {
  return getHashPromise(type, name)
  .then((value) => {
    redisStore.arrayObjsStringsToJson(
      value, rsConstant.fieldsToStringify[type]
    );
    return Promise.resolve(value);
  })
  .catch((err) => Promise.reject(err));
} // getValue

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
 * and the corresponding hash identified by "name". Use this to delete a single
 * key from the subjectStore, aspectStore or SampleStore.
 * @param  {String} type - The type of the master list on which the
 *  set operations are to be performed
 * @param {String} name - Name of the key to be deleted
 * @returns {Promise} - which resolves to the values returned by the redis
 * batch command
 */
function deleteKey(type, name) {
  const indexName = redisStore.constants.indexKey[type];
  const key = redisStore.toKey(type, name);
  const cmds = [];

  // remove the entry from the master index of type
  if (indexName) {
    cmds.push(['srem', indexName, key]);
  }

  // delete the hash
  cmds.push(['del', key]);
  return redisClient.batch(cmds).execAsync()
  .then((ret) => Promise.resolve(ret))
  .catch((err) => Promise.reject(err));
} // deleteKey

/**
 * Deletes entries from the sample master list of indexes that matches
 * the "subject name" part or the "aspect name" part of the entry. The hash
 * identified by the deleted entry is also deleted. Use this only to delete
 * multiple keys in the sample master list of indexes and its related hashes.
 * @param  {String} type - The type of the master list on which the
 *  set operations are to be performed
 * @param  {String} objectName - The object name (like Subject, Aspect, Sample)
 * @param {String} name - The name of the key to be deleted
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
     * Go through the members in the sample master list of indexes.
     * Split the name parts. If the object type is subject and the
     * "subjectNamepart" matches the nameKey remove it from the SampleStore.
     * There is also a hash with the same name as this, delete that hash too.
     * If the object type is aspect and the and aspect name matches the name,
     * remove it from the sample master index and delete the hash.
     */
    keys.forEach((key) => {
      const nameParts = key.split('|');
      const subjectKey = nameParts[0];
      const aspect = nameParts[1];
      if ((objectName.toLowerCase() === subjectType && nameKey === subjectKey)
        || (objectName.toLowerCase() === aspectType &&
          name.toLowerCase() === aspect)) {
        keyArr.push(key);
      }
    });

    // remove the entry from the master list of index
    cmds.push(['srem', indexName, Array.from(keyArr)]);

    // delete the hash too
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

  /**
   * Command to delete key from master index
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @returns {Array} - Command array
   */
  delKeyFromIndexCmd(type, name) {
    const indexName = redisStore.constants.indexKey[type];
    const nameKey = redisStore.toKey(type, name);
    return ['srem', indexName, nameKey];
  },

  /**
   * Command to add key to master index
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @returns {Array} - Command array
   */
  addKeyToIndexCmd(type, name) {
    const indexName = redisStore.constants.indexKey[type];
    const nameKey = redisStore.toKey(type, name);
    return ['sadd', indexName, nameKey];
  },

  /**
   * Command to check if key exists in master index
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @returns {Array} - Command array
   */
  keyExistsInIndexCmd(type, name) {
    const indexName = redisStore.constants.indexKey[type];
    const nameKey = redisStore.toKey(type, name);
    return ['sismember', indexName, nameKey];
  },

  /**
   * Command to delete aspect from subject set
   * @param  {String} subjAbsPath - Subject absolute path
   * @param  {String} aspName - Aspect name
   * @returns {Array} - Command array
   */
  delAspFromSubjSetCmd(subjAbsPath, aspName) {
    return [
      'srem',
      redisStore.toKey(subAspMapType, subjAbsPath),
      aspName.toLowerCase(),
    ];
  },

  /**
   * Command to check if aspect exists in subject set
   * @param  {String} subjAbsPath - Subject absolute path
   * @param  {String} aspName - Aspect name
   * @returns {Array} - Command array
   */
  aspExistsInSubjSetCmd(subjAbsPath, aspName) {
    return [
      'sismember',
      redisStore.toKey(subAspMapType, subjAbsPath),
      aspName.toLowerCase(),
    ];
  },

  /**
   * Command to add aspect in subject set
   * @param  {String} subjAbsPath - Subject absolute path
   * @param  {String} aspName - Aspect name
   * @returns {Array} - Command array
   */
  addAspectInSubjSetCmd(subjAbsPath, aspName) {
    return [
      'sadd',
      redisStore.toKey(subAspMapType, subjAbsPath),
      aspName.toLowerCase(),
    ];
  },

  /**
   * Command to delete hash
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @returns {Array} - Command array
   */
  delHashCmd(type, name) {
    return [
      'del',
      redisStore.toKey(type, name),
    ];
  },

  /**
   * Command to get complete hash.
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @returns {Array} - Command array
   */
  getHashCmd(type, name) {
    return [
      'hgetall',
      redisStore.toKey(type, name),
    ];
  },

  /**
   * Command to set multiple fields in a hash
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @param {Object} kvObj - Key value pairs
   * @returns {array} - Command array
   */
  setHashMultiCmd(type, name, kvObj) {
    if (!Object.keys(kvObj).length) {
      return [];
    }

    const key = redisStore.toKey(type, name);
    logInvalidHmsetValues(key, kvObj);
    return [
      'hmset',
      key,
      kvObj,
    ];
  },

  /**
   * Set multiple fields in a hash
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @param {Object} kvObj - Key value pairs
   * @returns {Promise} - Resolves to nothing if no key value, else "OK"
   */
  setHashMultiPromise(type, name, kvObj) {
    if (!Object.keys(kvObj).length) {
      return Promise.resolve();
    }

    const key = redisStore.toKey(type, name);
    logInvalidHmsetValues(key, kvObj);
    return redisClient.hmsetAsync(key, kvObj);
  },

  /**
   * Command to delete a hash field
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @param {String} fieldName - Name of field
   * @returns {array} - Command array
   */
  delHashFieldCmd(type, name, fieldName) {
    return ['hdel', redisStore.toKey(type, name), fieldName];
  },

  /**
   * Execute command asynchronously
   * @param  {Array} cmds - array of commands
   * @returns {Promise} - Resolves to commands responses
   */
  executeBatchCmds(cmds) {
    return redisClient.batch(cmds).execAsync();
  },

  renameKey,

  renameKeys,

  deleteKey,

  deleteKeys,

  addKey,

  hmSet,

  setValue,

  subjectType,

  aspectType,

  sampleType,

  subAspMapType,

  getValue,

  getHashPromise,
}; // export
