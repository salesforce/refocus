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

const Promise = require('bluebird');
const redisStore = require('./sampleStore');
const logInvalidHmsetValues = require('../utils/common').logInvalidHmsetValues;
const redisClient = require('./redisCache').client.sampleStore;
const statusCalculation = require('./statusCalculation');
const rsConstant = redisStore.constants;
const keyType = redisStore.constants.objectType;
const subjectType = keyType.subject;
const subAspMapType = keyType.subAspMap;
const aspSubMapType = keyType.aspSubMap;
const aspectType = keyType.aspect;
const sampleType = keyType.sample;
const Status = require('../db/constants').statuses;

const rangeNameToStatus = {
  criticalRange: 'Critical',
  warningRange: 'Warning',
  infoRange: 'Info',
  okRange: 'OK',
};

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
 * and the corresponding hash identified by "name".
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
   * Setup writers, tags, and ranges for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  setupKeysForAspect(aspect) {
    return Promise.join(
      module.exports.setTags(aspect),
      module.exports.setWriters(aspect),
      module.exports.setRanges(aspect),
    );
  },

  /**
   * Remove writers, tags, and ranges for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  removeKeysForAspect(aspect) {
    return Promise.join(
      module.exports.removeTags(aspect),
      module.exports.removeWriters(aspect),
      module.exports.removeRanges(aspect),
    );
  },

  /**
   * Reset tags keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  resetTags(aspect) {
    return Promise.join(
      module.exports.removeTags(aspect),
      module.exports.setTags(aspect),
    );
  }, // resetTags

  /**
   * Reset writers keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  resetWriters(aspect) {
    return Promise.join(
      module.exports.removeWriters(aspect),
      module.exports.setWriters(aspect),
    );
  }, // resetWriters

  /**
   * Reset ranges keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  resetRanges(aspect) {
    return Promise.join(
      module.exports.removeRanges(aspect),
      module.exports.setRanges(aspect),
    );
  }, // resetRanges

  /**
   * Remove tags keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  removeTags(aspect) {
    const key = redisStore.toKey(keyType.aspTags, aspect.name);
    return redisClient.delAsync(key);
  }, // removeTags

  /**
   * Remove writers keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  removeWriters(aspect) {
    const key = redisStore.toKey(keyType.aspWriters, aspect.name);
    return redisClient.delAsync(key);
  }, // removeWriters

  /**
   * Remove ranges keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  removeRanges(aspect) {
    const key = redisStore.toKey(keyType.aspRanges, aspect.name);
    return redisClient.delAsync(key);
  }, // removeRanges

  /**
   * Get tags keys for this aspect
   *
   * @param  {Object} aspect
   * @returns {Promise<Array>}
   */
  getTags(aspect) {
    const key = redisStore.toKey(keyType.aspTags, aspect.name);
    return redisClient.smembersAsync(key);
  },

  /**
   * Get writers keys for this aspect
   *
   * @param  {Object} aspect
   * @returns {Promise<Array>}
   */
  getWriters(aspect) {
    const key = redisStore.toKey(keyType.aspWriters, aspect.name);
    return redisClient.smembersAsync(key);
  },

  /**
   * Get ranges keys for this aspect
   *
   * @param  {Object} aspect
   * @returns {Promise<Array>}
   */
  getRanges(aspect) {
    const key = redisStore.toKey(keyType.aspRanges, aspect.name);
    return redisClient.zrangeAsync(key, 0, -1, 'WITHSCORES');
  },

  /**
   * Get ranges keys for this aspect
   *
   * @param  {Object} aspect
   * @returns {Promise<Object>}
   */
  getTagsWritersRanges(aspect) {
    return Promise.join(
      module.exports.getTags(aspect),
      module.exports.getWriters(aspect),
      module.exports.getRanges(aspect),
    )
    .then(([tags, writers, ranges]) => ({ tags, writers, ranges }));
  },

  /**
   * Set tags keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  setTags(aspect) {
    const key = redisStore.toKey(keyType.aspTags, aspect.name);
    if (aspect.tags && aspect.tags.length) {
      return redisClient.saddAsync(key, aspect.tags);
    }
  }, // setTags

  /**
   * Set writers keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  setWriters(aspect) {
    const key = redisStore.toKey(keyType.aspWriters, aspect.name);
    const writerNames = aspect.writers && aspect.writers.map(w => w.name);

    if (writerNames && writerNames.length) {
      return redisClient.saddAsync(key, writerNames);
    }
  }, // setWriters

  /**
   * Set ranges keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  setRanges(aspect) {
    let ranges = statusCalculation.getAspectRanges(aspect);
    ranges = statusCalculation.preprocessOverlaps(ranges);
    return statusCalculation.setRanges(ranges, aspect.name);
  }, // setRanges

  /**
   * Calculate the sample status based on the ranges set for this sample's aspect.
   *
   * @param  {Object} sampleName - Sample name
   * @param  {Object} value - Sample value
   * @returns {Promise} - resolves to the sample status
   */
  calculateSampleStatus(sampleName, value) {
    // aspect name
    const aspName = sampleName.split('|')[1];

    // value
    try {
      value = statusCalculation.prepareValue(value);
    } catch (err) {
      return Status[err.message] ? Promise.resolve(err.message) : Promise.reject(err);
    }

    // calculate
    return statusCalculation.calculateStatus(aspName, value);
  }, // calculateSampleStatus

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

  getValue,

  getHashPromise,

  executeBatchCmds,

  delSubFromAspSetCmd,

  delAspFromSubjSetCmd,
}; // export
