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
const keyType = redisStore.constants.objectType;
const subjectType = keyType.subject;
const subAspMapType = keyType.subAspMap;
const aspSubMapType = keyType.aspSubMap;
const aspectType = keyType.aspect;
const sampleType = keyType.sample;
const Status = require('../db/constants').statuses;

const batchableCmds = [
  'set', 'del', 'rename', 'exists', 'touch',
  'sadd', 'srem', 'sismember', 'smembers', 'sunionstore',
  'hmset', 'hgetall', 'hdel',
  'zadd', 'zrange', 'zrangebyscore',
];

class RedisOps {
  /**
   * Initialize a RedisOps object, specifying whether methods should be
   * executed standalone or as part of a batch.
   *
   * @param  {Boolean} enableBatch
   * @param  {Boolean} parentBatch
   * @returns {RedisOps}
   */
  constructor(enableBatch, parentBatch) {
    if (enableBatch) {
      this.parentBatch = parentBatch;
      this.batch = parentBatch ? parentBatch.batch : redisClient.batch();
      this.savedResults = {};
      this.transforms = [];
    }
  }

  /**
   * Set prototype properties.
   */
  static setPrototype() {
    RedisOps.setConstants();
    RedisOps.setupBatchableCmds();
  }

  /**
   * Set constants.
   */
  static setConstants() {
    RedisOps.prototype.subjectType = subjectType;
    RedisOps.prototype.aspectType = aspectType;
    RedisOps.prototype.sampleType = sampleType;
    RedisOps.prototype.subAspMapType = subAspMapType;
    RedisOps.prototype.aspSubMapType = aspSubMapType;
  }

  /**
   * Set up batchable versions of redis commands to be used in the ops methods
   */
  static setupBatchableCmds() {
    batchableCmds.forEach((cmd) => {
      RedisOps.prototype[cmd] = function (...args) {
        return this.executeBatchableCmd(cmd, ...args);
      };
    });
  }

  /**
   * Start a batch. Any subsequent commands will be queued up and sent together
   * on exec().
   *
   * @returns {RedisOps}
   */
  batchCmds() {
    const enableBatch = true;
    const existingBatch = this.batch && this;
    return new RedisOps(enableBatch, existingBatch);
  }

  /**
   * Execute the given redis command, either by adding to an active batch queue
   * or by executing directly.
   *
   * @param  {String} cmd - redis command name
   * @param  {Array} args - args to pass to the redis command
   * @returns {RedisOps|Promise}
   */
  executeBatchableCmd(cmd, ...args) {
    const client = this.batch || redisClient;
    const runCmd = client[cmd].bind(client);
    if (this.batch) {
      runCmd(...args);
      return this;
    } else {
      return Promise.promisify(runCmd)(...args);
    }
  }

  /**
   * Execute a redis command that does nothing.
   *
   * @returns {RedisOps|Promise}
   */
  noOp() {
    return this.touch('');
  }

  /**
   * Conditionally add commands to an active batch.
   *
   * @param  {Boolean} test - determines whether or not to execute fn
   * @param  {Function} fn - function that adds commands to the batch
   * @returns {RedisOps}
   */
  if(test, fn) {
    if (!this.batch) return this;

    if (test) {
      fn(this);
    }

    return this;
  }

  /**
   * Add commands to an active batch by mapping an array.
   *
   * @param  {Array} arr - array to map
   * @param  {Function} fn - function that adds commands to the batch for each array element
   * @returns {RedisOps}
   */
  map(arr, fn) {
    if (!this.batch) return this;

    arr.forEach((element) =>
      fn(this, element)
    );

    return this;
  }

  /**
   * Add commands to an active batch, making their result available after the
   * batch is executed.
   *
   * @param  {String} key - property name to be set on the result object
   * @param  {Function} fn - function that adds commands to the batch
   * @param  {Function} transform - function to transform the result before returning
   * @returns {RedisOps}
   */
  return(key, fn, transform) {
    if (!this.batch) return this;

    fn(this);
    const cmdIndex = this.batch.queue.length - 1;
    const cmd = this.batch.queue.toArray()[cmdIndex];
    cmd.callback = ((err, res) => {
      const transform = this.transforms[cmdIndex];
      if (transform) {
        res = transform(res);
      }

      this.savedResults[key] = res;
    });

    return this;
  }

  /**
   * Add commands to an active batch by mapping an array, making their result
   * available after the batch is executed.
   *
   * @param  {Boolean} arr - array to map
   * @param  {String} key - property name to be set on the result object
   * @param  {Function} fn - function that adds commands to the batch for each array element
   * @returns {RedisOps|Promise}
   */
  returnAll(arr, key, fn) {
    if (!this.batch) return this;

    const queueSizeBefore = this.batch.queue && this.batch.queue.length || 0;
    this.map(arr, fn);
    const cmdsAndIndexes = Object.entries(this.batch.queue.toArray()).slice(queueSizeBefore);

    this.savedResults[key] = [];
    cmdsAndIndexes.forEach(([cmdIndex, cmd], i) => {
      cmd.callback = ((err, res) => {
        const transform = this.transforms[cmdIndex];
        if (transform) {
          res = transform(res);
        }

        this.savedResults[key][i] = res;
      });
    });

    return this;
  }

  /**
   * Return the provided result, either as a promise or as part of an active batch
   *
   * @param  {Any} res - result to return
   * @returns {RedisOps|Promise}
   */
  returnValue(res) {
    return this.transform(
      (batch) => batch.noOp(),
      () => res
    );
  }

  /**
   * Add commands to an active batch, transforming the result before returning
   *
   * @param  {Function} fn - function that adds commands to the batch
   * @param  {Function} transform - function to transform the result before returning
   * @returns {RedisOps}
   */
  transform(fn, transform) {
    if (!this.batch) {
      return fn(this).then(transform);
    } else {
      fn(this);
      const i = this.batch.queue.length - 1;
      this.transforms[i] = transform;
      return this;
    }
  }


  /**
   * Execute the queued batch commands if this is the top-level RedisOps object,
   * or continue the batch chain if it's nested.
   *
   * @returns {RedisOps|Promise}
   */
  exec() {
    if (this.batch && !this.parentBatch) {
      const _batch = this.batch;
      this.batch = null;
      return _batch.execAsync()
      .then((res) => {
        if (Object.keys(this.savedResults).length) {
          return this.savedResults;
        } else {
          this.transforms.forEach((transform, i) =>
            res[i] = transform(res[i])
          );

          return res;
        }
      });
    } else {
      Object.assign(this.parentBatch.transforms, this.transforms);
      return this.parentBatch;
    }
  }

  /**
   * Clean and store an object as a hash.
   *
   * @param  {String} objType - Object type (aspect|subject|sample)
   * @param  {String} name  - Object name (subject absolutePath | aspect name | sample name)
   * @param  {Object} obj - Object to set as a hash
   * @returns {Promise} - which resolves to true
   */
  setHash(objType, name, obj) {
    const capitalizedObjName = objType.charAt(0).toUpperCase() + objType.slice(1);
    const cleanobj = redisStore[`clean${capitalizedObjName}`](obj);
    const nameKey = redisStore.toKey(objType, name);
    logInvalidHmsetValues(nameKey, cleanobj);
    return this.hmset(nameKey, cleanobj);
  } // setHash

  /**
   * Sets the value of the hash specified by the name argument.
   * @param  {String} objectName - Name of the object.
   * @param  {String} name  - Name used to identify the hash
   * @param  {Object} value - The value object's key/value are set as the
   * key/value of the hash that is created or updated.
   * @returns {Promise} - which resolves to true
   */
  setValue(objectName, name, value) {
    const nameKey = redisStore.toKey(objectName, name);
    return this.set(nameKey, value);
  } // setValue

  /**
   * Promise to get complete hash
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @returns {Promise} - Resolves to object
   */
  getHash(type, name) {
    const nameKey = redisStore.toKey(type, name);
    return this.hgetall(nameKey);
  } // getHash

  /**
   * Adds an entry identified by name to the master list of indices identified
   * by "type"
   * @param  {String} type - The type of the master list on which the
   *  set operations are to be performed
   * @param {String} name - Name of the key to be added
   * @returns {Promise} - which resolves to the values returned by the redis
   *  command
   */
  addKey(type, name) {
    const indexName = redisStore.constants.indexKey[type];
    const nameKey = redisStore.toKey(type, name);
    return this.sadd(indexName, nameKey);
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
  deleteKey(type, name) {
    const indexName = redisStore.constants.indexKey[type];
    const key = redisStore.toKey(type, name);
    return this.batchCmds()

      // remove the entry from the master index of type
      .if(indexName, (batch) =>
        batch.srem(indexName, key)
      )

      // delete the hash
      .del(key)

      .exec();
  } // deleteKey

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
  renameKey(type, oldName, newName) {
    const newKey = redisStore.toKey(type, newName);
    const oldKey = redisStore.toKey(type, oldName);
    const indexName = redisStore.constants.indexKey[type];

    return this.batchCmds()

    // remove the old key from the master list of index
    .srem(indexName, oldKey)

    // add the new key to the master list of index
    .sadd(indexName, newKey)

    // rename the set with the new name
    .rename(oldKey, newKey)

    .exec();
  } // renameKey

  /**
   * Command to delete subject from aspect resource mapping
   * @param  {String} aspName - Aspect name
   * @param  {String} subjAbsPath - Subject absolute path
   * @returns {Array} - Command array
   */
  delSubFromAspSet(aspName, subjAbsPath) {
    aspName = aspName.toLowerCase();
    subjAbsPath = subjAbsPath.toLowerCase();
    const aspKey = redisStore.toKey(aspSubMapType, aspName);
    return this.srem(aspKey, subjAbsPath);
  }

  /**
   * Command to delete aspect from subject set
   * @param  {String} subjAbsPath - Subject absolute path
   * @param  {String} aspName - Aspect name
   * @returns {Array} - Command array
   */
  delAspFromSubjSet(subjAbsPath, aspName) {
    subjAbsPath = subjAbsPath.toLowerCase();
    aspName = aspName.toLowerCase();
    const subKey = redisStore.toKey(subAspMapType, subjAbsPath);
    return this.srem(subKey, aspName);
  }

  /**
   * Command to delete key from master index
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @returns {Array} - Command array
   */
  delKeyFromIndex(type, name) {
    const indexName = redisStore.constants.indexKey[type];
    const nameKey = redisStore.toKey(type, name);
    return this.srem(indexName, nameKey);
  }

  /**
   * Command to add key to master index
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @returns {Array} - Command array
   */
  addKeyToIndex(type, name) {
    const indexName = redisStore.constants.indexKey[type];
    const nameKey = redisStore.toKey(type, name);
    return this.sadd(indexName, nameKey);
  }

  /**
   * Command to check if key exists in master index
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @returns {Array} - Command array
   */
  keyExistsInIndex(type, name) {
    const indexName = redisStore.constants.indexKey[type];
    const nameKey = redisStore.toKey(type, name);
    return this.sismember(indexName, nameKey);
  }

  /**
   * Command to check if aspect exists in subject set
   * @param  {String} subjAbsPath - Subject absolute path
   * @param  {String} aspName - Aspect name
   * @returns {Array} - Command array
   */
  aspExistsInSubjSet(subjAbsPath, aspName) {
    subjAbsPath = subjAbsPath.toLowerCase();
    aspName = aspName.toLowerCase();
    const nameKey = redisStore.toKey(subAspMapType, subjAbsPath);
    return this.sismember(nameKey, aspName);
  }

  /**
   * Command to check if subject absolute path exists in aspect-to-subject
   * respurce map
   * @param  {String} aspName - Aspect name
   * @param  {String} subjAbsPath - Subject absolute path
   * @returns {Array} - Command array
   */
  subjAbsPathExistsInAspSet(aspName, subjAbsPath) {
    aspName = aspName.toLowerCase();
    subjAbsPath = subjAbsPath.toLowerCase();
    const nameKey = redisStore.toKey(aspSubMapType, aspName);
    return this.sismember(nameKey, subjAbsPath);
  }

  /**
   * Command to add aspect in subject set
   * @param  {String} subjAbsPath - Subject absolute path
   * @param  {String} aspName - Aspect name
   * @returns {Array} - Command array
   */
  addAspectInSubjSet(subjAbsPath, aspName) {
    subjAbsPath = subjAbsPath.toLowerCase();
    aspName = aspName.toLowerCase();
    const key = redisStore.toKey(subAspMapType, subjAbsPath);
    return this.sadd(key, aspName);
  }

  /**
   * Command to delete hash
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @returns {Array} - Command array
   */
  delHash(type, name) {
    const key = redisStore.toKey(type, name);
    return this.del(key);
  }

  /**
   * Command to set multiple fields in a hash
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @param {Object} kvObj - Key value pairs
   * @returns {array} - Command array
   */
  setHashMulti(type, name, kvObj) {
    if (!Object.keys(kvObj).length) {
      return [];
    }

    const key = redisStore.toKey(type, name);
    logInvalidHmsetValues(key, kvObj);
    return this.hmset(key, kvObj);
  }

  /**
   * Command to delete a hash field
   * @param  {String} type - Object type
   * @param  {String} name - Object name
   * @param {String} fieldName - Name of field
   * @returns {array} - Command array
   */
  delHashField(type, name, fieldName) {
    const key = redisStore.toKey(type, name);
    return this.hdel(key, fieldName);
  }

  /**
   * Delete subject from aspect-to-subject respurce maps
   * @param  {Array} aspNamesArr - Array of aspect names
   * @param {String} subjectAbsPath - Subject absolute path
   * @returns {Array of Arrays} - Array of redis commands
   */
  deleteSubjectFromAspectResourceMaps(aspNamesArr, subjectAbsPath) {
    return this.batchCmds()
    .map(aspNamesArr, (batch, aspName) =>
      batch.delSubFromAspSet(aspName, subjectAbsPath)
    )
    .exec();
  }

  /**
   * Delete aspect from subject-to-aspect respurce maps
   * @param  {Array} subjectAbsPathArr - Array of subject absolute paths
   * @param {String} aspName - Aspect name
   * @returns {Array} Redis command
   */
  deleteAspectFromSubjectResourceMaps(subjectAbsPathArr, aspName) {
    return this.batchCmds()
    .map(subjectAbsPathArr, (batch, subjAbsPath) =>
      batch.delAspFromSubjSet(subjAbsPath, aspName)
    )
    .exec();
  }

  /**
   * Get aspect-to-subject resource map members
   * @param  {String}  aspName - Aspect name
   * @returns {Array} Redis command
   */
  getAspSubjMapMembers(aspName) {
    aspName = aspName.toLowerCase();
    const key = redisStore.toKey(aspSubMapType, aspName);
    return this.smembers(key);
  }

  /**
   * Get subject-to-aspect resource map members
   * @param  {String}  subjAbsPath - Subject absolute path
   * @returns {Array} Redis command
   */
  getSubjAspMapMembers(subjAbsPath) {
    subjAbsPath = subjAbsPath.toLowerCase();
    const key = redisStore.toKey(subAspMapType, subjAbsPath);
    return this.smembers(key);
  }

  /**
   * Add subject absolute path to aspect-to-subject resource map.
   * @param {String}  aspName - Aspect name
   * @param {string}  subjAbsPath - Subject absolute path
   * @returns {Array} Redis command
   */
  addSubjectAbsPathInAspectSet(aspName, subjAbsPath) {
    aspName = aspName.toLowerCase();
    subjAbsPath = subjAbsPath.toLowerCase();
    const aspectSetKey = redisStore.toKey(aspSubMapType, aspName);
    return this.sadd(aspectSetKey, subjAbsPath);
  }

  /**
   * Add aspect name to subject-to-aspect resource map.
   * @param {String}  subjAbsPath - Subject absolute path
   * @param {string}  aspName - Aspect name
   * @returns {Array} Redis command
   */
  addAspectNameInSubjectSet(subjAbsPath, aspName) {
    subjAbsPath = subjAbsPath.toLowerCase();
    aspName = aspName.toLowerCase();
    const subjectSetKey = redisStore.toKey(subAspMapType, subjAbsPath);
    return this.sadd(subjectSetKey, aspName);
  }

  /**
   * Duplicate a set
   * @param  {String}  setType - Set type in sample store,
   *  e.g. subaspmap|aspsubmap etc
   * @param  {String}  nameTo - New set name
   * @param  {string}  nameFrom - Old set name
   * @returns {Array} Redis command
   */
  duplicateSet(setType, nameTo, nameFrom) {
    nameTo = nameTo.toLowerCase();
    nameFrom = nameFrom.toLowerCase();
    const fromSet = redisStore.toKey(setType, nameFrom);
    const toSet = redisStore.toKey(setType, nameTo);
    return this.sunionstore(toSet, fromSet);
  }

  /**
   * Setup existence and tags for this subject.
   *
   * @param  {Object} subject
   * @returns {Promise}
   */
  setupKeysForSubject(subject) {
    return this.batchCmds()
    .setSubjectTags(subject)
    .setSubjectExists(subject)
    .exec();
  }

  /**
   * Remove existence and tags for this subject.
   *
   * @param  {Object} subject
   * @returns {Promise}
   */
  removeKeysForSubject(subject) {
    return this.batchCmds()
    .removeSubjectTags(subject)
    .removeSubjectExists(subject)
    .exec();
  }

  /**
   * Setup writers, tags, and ranges for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  setupKeysForAspect(aspect) {
    return this.batchCmds()
      .setAspectTags(aspect)
      .setAspectWriters(aspect)
      .setAspectRanges(aspect)
      .setAspectExists(aspect)
      .exec();
  }

  /**
   * Remove writers, tags, and ranges for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  removeKeysForAspect(aspect) {
    return this.batchCmds()
      .removeAspectTags(aspect)
      .removeAspectWriters(aspect)
      .removeAspectRanges(aspect)
      .removeAspectExists(aspect)
      .exec();
  }

  /**
   * Reset tags keys for this subject.
   *
   * @param  {Object} subject
   * @returns {Promise}
   */
  resetSubjectTags(subject) {
    return this.batchCmds()
    .removeSubjectTags(subject)
    .setSubjectTags(subject)
    .exec();
  } // resetSubjectTags

  /**
   * Reset tags keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  resetAspectTags(aspect) {
    return this.batchCmds()
      .removeAspectTags(aspect)
      .setAspectTags(aspect)
      .exec();
  } // resetAspectTags

  /**
   * Reset writers keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  resetAspectWriters(aspect) {
    return this.batchCmds()
      .removeAspectWriters(aspect)
      .setAspectWriters(aspect)
      .exec();
  } // resetAspectWriters

  /**
   * Reset ranges keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  resetAspectRanges(aspect) {
    return this.batchCmds()
      .removeAspectRanges(aspect)
      .setAspectRanges(aspect)
      .exec();
  } // resetAspectRanges

  /**
   * Remove tags keys for this subject.
   *
   * @param  {Object} subject
   * @returns {Promise}
   */
  removeSubjectTags(subject) {
    const key = redisStore.toKey(keyType.subTags, subject.absolutePath);
    return this.del(key);
  } // removeSubjectTags

  /**
   * Remove existence keys for this subject.
   *
   * @param  {Object} subject
   * @returns {Promise}
   */
  removeSubjectExists(subject) {
    const key = redisStore.toKey(keyType.subExists, subject.absolutePath);
    return this.del(key);
  } // removeSubjectExists

  /**
   * Remove tags keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  removeAspectTags(aspect) {
    const key = redisStore.toKey(keyType.aspTags, aspect.name);
    return this.del(key);
  } // removeAspectTags

  /**
   * Remove writers keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  removeAspectWriters(aspect) {
    const key = redisStore.toKey(keyType.aspWriters, aspect.name);
    return this.del(key);
  } // removeAspectWriters

  /**
   * Remove ranges keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  removeAspectRanges(aspect) {
    const key = redisStore.toKey(keyType.aspRanges, aspect.name);
    return this.del(key);
  } // removeAspectRanges

  /**
   * Remove existence keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  removeAspectExists(aspect) {
    const key = redisStore.toKey(keyType.aspExists, aspect.name);
    return this.del(key);
  } // removeAspectExists

  /**
   * Get tags keys for this subject.
   *
   * @param  {Object} subject
   * @returns {Promise}
   */
  getSubjectTags(subject) {
    const key = redisStore.toKey(keyType.subTags, subject.absolutePath);
    return this.smembers(key);
  } // getSubjectTags

  /**
   * Check if subject exists
   *
   * @param  {Object} subject
   * @returns {Promise<Boolean>}
   */
  subjectExists(subject) {
    const key = redisStore.toKey(keyType.subExists, subject.absolutePath);
    return this.exists(key);
  }

  /**
   * Get tags keys for this aspect
   *
   * @param  {Object} aspect
   * @returns {Promise<Array>}
   */
  getAspectTags(aspect) {
    const key = redisStore.toKey(keyType.aspTags, aspect.name);
    return this.smembers(key);
  }

  /**
   * Get writers keys for this aspect
   *
   * @param  {Object} aspect
   * @returns {Promise<Array>}
   */
  getAspectWriters(aspect) {
    const key = redisStore.toKey(keyType.aspWriters, aspect.name);
    return this.smembers(key);
  }

  /**
   * Get ranges keys for this aspect
   *
   * @param  {Object} aspect
   * @returns {Promise<Array>}
   */
  getAspectRanges(aspect) {
    const key = redisStore.toKey(keyType.aspRanges, aspect.name);
    return this.zrange(key, 0, -1, 'WITHSCORES');
  }

  /**
   * Check if aspect exists
   *
   * @param  {Object} aspect
   * @returns {Promise<Boolean>}
   */
  aspectExists(aspect) {
    const key = redisStore.toKey(keyType.aspExists, aspect.name);
    return this.exists(key);
  }

  /**
   * Get ranges keys for this aspect
   *
   * @param  {Object} aspect
   * @returns {Promise<Object>}
   */
  getAspectTagsWritersRanges(aspect) {
    return this.batchCmds()
      .return('tags', (batch) =>
        batch.getAspectTags(aspect)
      )
      .return('writers', (batch) =>
        batch.getAspectWriters(aspect)
      )
      .return('ranges', (batch) =>
        batch.getAspectRanges(aspect)
      )
      .exec();
  }

  /**
   * Set tags keys for this subject.
   *
   * @param  {Object} subject
   * @returns {Promise}
   */
  setSubjectTags(subject) {
    const key = redisStore.toKey(keyType.subTags, subject.absolutePath);
    return this.batchCmds()
    .if(subject.tags && subject.tags.length, (batch) =>
      batch.sadd(key, subject.tags)
    )
    .exec();
  } // setSubjectTags

  /**
   * Set exists keys for this subject.
   *
   * @param  {Object} subject
   * @returns {Promise}
   */
  setSubjectExists(subject) {
    const key = redisStore.toKey(keyType.subExists, subject.absolutePath);
    return this.set(key, 'true');
  } // setSubjectExists

  /**
   * Set tags keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  setAspectTags(aspect) {
    const key = redisStore.toKey(keyType.aspTags, aspect.name);
    return this.batchCmds()
    .if(aspect.tags && aspect.tags.length, (batch) =>
      batch.sadd(key, aspect.tags)
    )
    .exec();
  } // setAspectTags

  /**
   * Set writers keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  setAspectWriters(aspect) {
    const key = redisStore.toKey(keyType.aspWriters, aspect.name);
    const writerNames = aspect.writers && aspect.writers.map(w => w.name);

    return this.batchCmds()
    .if(writerNames && writerNames.length, (batch) =>
      batch.sadd(key, writerNames)
    )
    .exec();
  } // setAspectWriters

  /**
   * Set ranges keys for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  setAspectRanges(aspect) {
    let ranges = statusCalculation.getAspectRanges(aspect);
    ranges = statusCalculation.preprocessOverlaps(ranges);
    return statusCalculation.setRanges(this, ranges, aspect.name);
  } // setAspectRanges

  /**
   * Set exists key for this aspect.
   *
   * @param  {Object} aspect
   * @returns {Promise}
   */
  setAspectExists(aspect) {
    const key = redisStore.toKey(keyType.aspExists, aspect.name);
    return this.set(key, 'true');
  } // setAspectExists

  /**
   * Calculate the sample status based on the ranges set for this sample's aspect.
   *
   * @param  {Object} sampleName - Sample name
   * @param  {Object} value - Sample value
   * @returns {Promise} - resolves to the sample status
   */
  calculateSampleStatus(sampleName, value) {
    return statusCalculation.calculateStatus(this, sampleName, value);
  } // calculateSampleStatus
} // RedisOps

RedisOps.setPrototype();
module.exports = new RedisOps();
