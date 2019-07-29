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
const aspSubMapType = redisStore.constants.objectType.aspSubMap;
const aspectType = redisStore.constants.objectType.aspect;
const sampleType = redisStore.constants.objectType.sample;
const subjectTagsType = redisStore.constants.objectType.subjectTags;
const aspectTagsType = redisStore.constants.objectType.aspectTags;
const aspectWritersType = redisStore.constants.objectType.aspectWriters;
const aspectRangesType = redisStore.constants.objectType.aspectRanges;
const status = require('../db/constants').statuses;

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
 *
 * @param  {String} objectName - Name of the object.
 * @param  {String} name  - Name used to identify the hash
 * @param  {Object} value - The value object's key/value are set as the
 * key/value of the hash that is created or updated.
 * @returns {Promise|Array} - Promise which resolves to true or command if
 * returnCmd is true.
 */
function hmSet(objectName, name, value, returnCmd=false) {
  const cleanobj =
    redisStore['clean' + capitalizeFirstLetter(objectName)](value);
  const nameKey = redisStore.toKey(objectName, name);
  logInvalidHmsetValues(nameKey, cleanobj);

  if (returnCmd) {
    return ['hmset', nameKey, cleanobj];
  }

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
 * @returns {Promise|Array} - Promise which resolves to the values returned
 * by the redis command | command array if returnCmd is true.
 */
function addKey(type, name, returnCmd=false) {
  const indexName = redisStore.constants.indexKey[type];
  const nameKey = redisStore.toKey(type, name);

  if (returnCmd) {
    return ['sadd', indexName, nameKey];
  }

  return redisClient.saddAsync(indexName, nameKey)
  .then((ok) => Promise.resolve(ok))
  .catch((err) => Promise.reject(err));
} // addKey

/**
 * Deletes an entry from the master list of indices identified by "type" and
 * and the corresponding hash identified by "name".
 * @param  {String} type - The type of the master list on which the
 *  set operations are to be performed
 * @param {String} name - Name of the key to be deleted
 * @param {Array} additionalCmds - Additional commands which can be batched
 * @returns {Promise} - which resolves to the values returned by the redis
 * batch command
 */
function deleteKey(type, name, additionalCmds=[]) {
  const indexName = redisStore.constants.indexKey[type];
  const key = redisStore.toKey(type, name);
  const cmds = [];

  // remove the entry from the master index of type
  if (indexName) {
    cmds.push(['srem', indexName, key]);
  }

  // delete the hash
  cmds.push(['del', key]);
  if (additionalCmds && additionalCmds.length > 0) {
    cmds.push(...additionalCmds);
  }

  return redisClient.batch(cmds).execAsync()
  .then((ret) => Promise.resolve(ret))
  .catch((err) => Promise.reject(err));
} // deleteKey

/**
 * Deletes the samples associated with the passed in association type.
 * @param  {String} associationType - Association type, using which the lookup
 * needs to be done.
 * @param  {String} name  - Name of the object whose related samples are to be
 * deleted.
 * @returns {Array} of deleted sample
 */
function deleteSampleKeys(associationType, name) {
  let cmds = [];

  // Sample master list key. e.g.: samsto:samples
  const indexName = redisStore.constants.indexKey[sampleType];

  /* Association key. e.g: samsto:subaspmap:northamerica.unitedstates
  where associationType=subaspmap */
  const assocName = redisStore.toKey(associationType, name);

  // e.g samsto:sample:
  const sampleKeyPrefix = redisStore.constants.prefix +
   redisStore.constants.separator + sampleType + redisStore.constants.separator;
  const keyArr = [];
  let deletedSamples = [];
  return redisClient.smembersAsync(assocName)
  .then((members) => {
    members.forEach((member) => {
      let sampleKey = sampleKeyPrefix;

      if (associationType === subAspMapType) {
        // name is subject absolute path and member is an aspect name
        sampleKey = sampleKey + name.toLowerCase() + '|' + member;
      } else if (associationType === aspSubMapType) {
        // name is aspect name and member is subject absolute path
        sampleKey = sampleKey + member + '|' + name.toLowerCase();
      }

      // sampleKey e.g: samsto:sample:northamerica.unitedstates|toohot
      keyArr.push(sampleKey);
      cmds.push(['hgetall', sampleKey]);
    });

    return redisClient.batch(cmds).execAsync();
  })
  .then((samples) => {
    deletedSamples = samples || [];

    /*
     * Delete all the sample hashes and remove the entries from the master
     * index of samples.
     */
    const delCmds = keyArr.map((key) => ['del', key]);
    const sremCmds = keyArr.map((key) => ['srem', indexName, key]);
    return executeBatchCmds(delCmds.concat(sremCmds));
  })
  .then(() => deletedSamples);
} // deleteSampleKeys

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
 * Command to delete subject from aspect resource mapping
 * @param  {String} aspName - Aspect name
 * @param  {String} subjAbsPath - Subject absolute path
 * @returns {Array} - Command array
 */
function delSubFromAspSetCmd(aspName, subjAbsPath) {
  return [
    'srem',
    redisStore.toKey(aspSubMapType, aspName.toLowerCase()),
    subjAbsPath.toLowerCase(),
  ];
}

/**
 * Execute command asynchronously
 * @param  {Array} cmds - array of commands
 * @returns {Promise} - Resolves to commands responses
 */
function executeBatchCmds(cmds) {
  return redisClient.batch(cmds).execAsync();
}

/**
 * Command to delete aspect from subject set
 * @param  {String} subjAbsPath - Subject absolute path
 * @param  {String} aspName - Aspect name
 * @returns {Array} - Command array
 */
function delAspFromSubjSetCmd(subjAbsPath, aspName) {
  return [
    'srem',
    redisStore.toKey(subAspMapType, subjAbsPath.toLowerCase()),
    aspName.toLowerCase(),
  ];
}

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
   * Command to check if aspect exists in subject set
   * @param  {String} subjAbsPath - Subject absolute path
   * @param  {String} aspName - Aspect name
   * @returns {Array} - Command array
   */
  aspExistsInSubjSetCmd(subjAbsPath, aspName) {
    return [
      'sismember',
      redisStore.toKey(subAspMapType, subjAbsPath.toLowerCase()),
      aspName.toLowerCase(),
    ];
  },

  /**
   * Command to check if subject absolute path exists in aspect-to-subject
   * respurce map
   * @param  {String} aspName - Aspect name
   * @param  {String} subjAbsPath - Subject absolute path
   * @returns {Array} - Command array
   */
  subjAbsPathExistsInAspSetCmd(aspName, subjAbsPath) {
    return [
      'sismember',
      redisStore.toKey(aspSubMapType, aspName.toLowerCase()),
      subjAbsPath.toLowerCase(),
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
      redisStore.toKey(subAspMapType, subjAbsPath.toLowerCase()),
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
    return ['hmset', key, kvObj];
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
   * Get samples for a given aspect
   * @param  {String} aspName - Aspect Name
   * @returns {Promise} - Resolves to array of samples
   */
  getSamplesFromAspectName(aspName) {
    const aspsubmapKey = redisStore.toKey(
      redisStore.constants.objectType.aspSubMap, aspName
    );
    const promiseArr = [];
    return redisClient.smembersAsync(aspsubmapKey)
    .then((subjNames) => {
      subjNames.forEach((subjName) => {
        const sampleName = subjName + '|' + aspName;
        promiseArr.push(redisClient.hgetallAsync(
          redisStore.toKey(redisStore.constants.objectType.sample, sampleName)
        ));
      });

      return Promise.all(promiseArr);
    });
  },

  /**
   * Delete subject from aspect-to-subject respurce maps
   * @param  {Array} aspNamesArr - Array of aspect names
   * @param {String} subjectAbsPath - Subject absolute path
   * @returns {Array of Arrays} - Array of redis commands
   */
  deleteSubjectFromAspectResourceMaps(aspNamesArr, subjectAbsPath) {
    const cmds = [];
    aspNamesArr.forEach((aspName) => {
      cmds.push(delSubFromAspSetCmd(
        aspName.toLowerCase(), subjectAbsPath.toLowerCase()));
    });

    return cmds;
  },

  /**
   * Delete aspect from subject-to-aspect respurce maps
   * @param  {Array} subjectAbsPathArr - Array of subject absolute paths
   * @param {String} aspName - Aspect name
   * @returns {Array} Redis command
   */
  deleteAspectFromSubjectResourceMaps(subjectAbsPathArr, aspName) {
    const cmds = [];
    subjectAbsPathArr.forEach((subjAbsPath) => {
      cmds.push(delAspFromSubjSetCmd(
        subjAbsPath.toLowerCase(), aspName.toLowerCase()));
    });

    return cmds;
  },

  /**
   * Get aspect-to-subject resource map members
   * @param  {String}  aspName - Aspect name
   * @returns {Array} Redis command
   */
  getAspSubjMapMembers(aspName) {
    const key = redisStore.toKey(aspSubMapType, aspName.toLowerCase());
    return ['smembers', key];
  },

  /**
   * Get subject-to-aspect resource map members
   * @param  {String}  subjAbsPath - Subject absolute path
   * @returns {Array} Redis command
   */
  getSubjAspMapMembers(subjAbsPath) {
    const key = redisStore.toKey(subAspMapType, subjAbsPath.toLowerCase());
    return ['smembers', key];
  },

  /**
   * Add subject absolute path to aspect-to-subject resource map.
   * @param {String}  aspName - Aspect name
   * @param {string}  subjAbsPath - Subject absolute path
   * @returns {Array} Redis command
   */
  addSubjectAbsPathInAspectSet(aspName, subjAbsPath) {
    const aspectSetKey = redisStore.toKey(aspSubMapType, aspName.toLowerCase());
    return ['sadd', aspectSetKey, subjAbsPath.toLowerCase()];
  },

  /**
   * Add aspect name to subject-to-aspect resource map.
   * @param {String}  subjAbsPath - Subject absolute path
   * @param {string}  aspName - Aspect name
   * @returns {Array} Redis command
   */
  addAspectNameInSubjectSet(subjAbsPath, aspName) {
    const subjectSetKey = redisStore.toKey(
      subAspMapType, subjAbsPath.toLowerCase());
    return ['sadd', subjectSetKey, aspName.toLowerCase()];
  },

  /**
   * Duplicate a set
   * @param  {String}  setType - Set type in sample store,
   *  e.g. subaspmap|aspsubmap etc
   * @param  {String}  nameTo - New set name
   * @param  {string}  nameFrom - Old set name
   * @returns {Array} Redis command
   */
  duplicateSet(setType, nameTo, nameFrom) {
    const fromSet = redisStore.toKey(setType, nameFrom.toLowerCase());
    const toSet = redisStore.toKey(setType, nameTo.toLowerCase());
    return ['sunionstore', toSet, fromSet];
  },

  /**
   * Execute one redis command
   * @param  {Array} redisCommand - Redis command
   * @returns {Promise} - Resolves to the result of redis command
   */
  executeCommand(redisCommand) {
    return executeBatchCmds([redisCommand])
    .then((results) => Promise.resolve(results[0]));
  },

  /**
   * Get tags key for a subject
   * @param absolutePath - subject absolute path
   * @returns {String} - subject tags key
   */
  getSubjectTagsKey(absolutePath) {
    return redisStore.toKey(subjectTagsType, absolutePath);
  },

  getAspectTagsKey(aspName) {
    return redisStore.toKey(aspectTagsType, aspName);
  },

  getAspectRangesKey(aspName) {
    return redisStore.toKey(aspectRangesType, aspName);
  },

  getAspectWritersKey(aspName) {
    return redisStore.toKey(aspectWritersType, aspName);
  },

  /**
   *
   * @param  {Object} sample - aspect object
   * @returns {Promise}
   */
  calculateSampleStatus(sample) {
    const [absPath, aspName] = sample.name.split('|');
    const { value } = sample;

    // Invalid if value is not a non-empty string!
    if (typeof value !== 'string' || value.length === 0) {
      return Promise.resolve(status.Invalid)
    }

    // "Timeout" special case
    if (value === status.Timeout) {
      return Promise.resolve(status.Timeout);
    }

    let num;

    // Boolean value type: Case-insensitive 'true'
    if (value.toLowerCase() === 'true') {
      num = 1;
    } else if (value.toLowerCase() === 'false') {
      // Boolean value type: Case-insensitive 'false'
      num = 0;
    } else {
      num = Number(value);
    }

    // If not true|false|Timeout, then value must be convertible to number!
    if (isNaN(num)) {
      return Promise.resolve(status.Invalid);
    }

    // Set status based on ranges
    const key = `samsto:aspectRanges:${aspName}`;
    return redisClient.zrangebyscoreAsync(key, num, '+inf', 'WITHSCORES', 'LIMIT', 0, 1)
      .then(([rangeName, score]) => {
        score = Number(score);
        if (rangeName) {
          let [status, rangeType] = rangeName.split(':');
          status = status.split('_')[1];
          if (rangeType === '1') { // max
            return status;
          } else if (rangeType === '0' && num === score) { // min
            return status;
          }
        }

        return status.Invalid;
      })
  }, // calculateSampleStatus

  /**
   *
   * @param  {Object} aspect - aspect object
   * @returns {Promise}
   */
  setTags(aspect) {
    const nameKey = `samsto:aspectTags:${aspect.name}`
    if (aspect.tags && aspect.tags.length) {
      return redisClient.saddAsync(nameKey, aspect.tags)
    }
  }, // setTags

  // TODO: figure out how to batch all three of these together
  /**
   *
   * @param  {Object} aspect - aspect object
   * @returns {Promise}
   */
  setWriters(aspect) {
    const nameKey = `samsto:writers:aspect:${aspect.name}`.toLowerCase();
    if (aspect.writers && aspect.writers.length) {
      const writerNames = aspect.writers && aspect.writers.map(w => w.name);
      return redisClient.saddAsync(nameKey, writerNames);
    }
  }, // setWriters

  /**
   *
   * @param  {Object} aspect - aspect object
   * @returns {Promise}
   */
  setRanges(aspect) {
    const nameKey = `samsto:aspectRanges:${aspect.name}`
    const batch = redisClient.batch();
    aspect.criticalRange && batch.zadd(nameKey, aspect.criticalRange[0], '1_Critical:0');
    aspect.criticalRange && batch.zadd(nameKey, aspect.criticalRange[1], '1_Critical:1');
    aspect.warningRange && batch.zadd(nameKey, aspect.warningRange[0], '2_Warning:0');
    aspect.warningRange && batch.zadd(nameKey, aspect.warningRange[1], '2_Warning:1');
    aspect.infoRange && batch.zadd(nameKey, aspect.infoRange[0], '3_Info:0');
    aspect.infoRange && batch.zadd(nameKey, aspect.infoRange[1], '3_Info:1');
    aspect.okRange && batch.zadd(nameKey, aspect.okRange[0], '4_OK:0');
    aspect.okRange && batch.zadd(nameKey, aspect.okRange[1], '4_OK:1');
    return batch.execAsync();
  }, // setRanges

  renameKey,

  deleteKey,

  deleteSampleKeys,

  addKey,

  hmSet,

  setValue,

  subjectType,

  aspectType,

  sampleType,

  subAspMapType,

  aspSubMapType,

  subjectTagsType,

  aspectRangesType,

  aspectWritersType,

  aspectTagsType,

  getValue,

  getHashPromise,

  executeBatchCmds,

  delSubFromAspSetCmd,

  delAspFromSubjSetCmd,
}; // export
