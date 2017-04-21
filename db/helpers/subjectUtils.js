/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/subjectUtils.js
 *
 * Used by the Subject model.
 */

const ParentSubjectNotFound = require('../dbErrors')
  .ParentSubjectNotFound;
const ParentSubjectNotMatch = require('../dbErrors')
  .ParentSubjectNotMatch;
const IllegalSelfParenting = require('../dbErrors')
  .IllegalSelfParenting;
const redisOps = require('../../cache/redisOps');
const subjectType = redisOps.subjectType;
const sampleType = redisOps.sampleType;

/**
 * Validates a given field ie. parentAbsolutePath, parentId.
 * throws error if parent subject not found, or is child subject.
 * Else returns parent subject.
 *
 * @param {Object} Subject - the model
 * @param {String} parentFieldVal - i.e. inst.parentAbsolutePath OR
 *  inst.parentId
 * @param {String} fieldVal - i.e. inst.absolutePath OR inst.id
 * @param {String} fieldName - i.e. absolutePath OR id
 * @returns {Promise} contains parent subject
 */
function validateParentField(Subject, parentFieldVal, fieldVal, fieldName) {
  return Subject.scope({ method: [fieldName, parentFieldVal] })
  .find()
  .then((parent) => {
    if (!parent) {
      throw new ParentSubjectNotFound({
        message: parentFieldVal + ' not found.',
      });
    }

    // if PAP === absolutePath || PID === id, throw cannot self parent error.
    if (parentFieldVal === fieldVal) {
      throw new IllegalSelfParenting({
        message: 'parentAbsolutePath cannot equal absolutePath: ' + fieldVal,
      });
    }

    // not getting here
    return parent;
  });
}

/**
 * Decrements childCount on old parent
 * Sets the parent-related fields on inst
 *
 * @param {Object} Subject - the model
 * @param {String} parentId - The new parentId
 * @param {String} parentAbsolutePath - The new parentAbsolutePath
 *  for new absolutePath
 * @param {Object} inst - the subject instance
 * @returns {Object} the subject instance
 */
function updateParentFields(Subject, parentId, parentAbsolutePath, inst) {
  return Subject.scope({ method:
    ['id', inst.previous('parentId')],
  }).find()
  .then((oldParent) => {
    if (oldParent) {
      oldParent.decrement('childCount');
    }

    const absolutePath = parentAbsolutePath ?
      parentAbsolutePath + '.' + inst.name : inst.name;

    // update the subject values
    inst.setDataValue('parentId', parentId);
    inst.setDataValue('parentAbsolutePath', parentAbsolutePath);
    inst.setDataValue('absolutePath', absolutePath);
    return inst;
  });
}

/**
 * @param {String} parentId
 * @param {String} parentAbsolutePath
 */
function throwNotMatchError(parentId, parentAbsolutePath) {
  throw new ParentSubjectNotMatch({
    message: 'parentId and parentAbsolutePath refer to different subjects.' +
    ' Found: ' + parentId + ', ' + parentAbsolutePath,
  });
}

/**
 * Deletes the subject entry AND multiple possible sample entries from the
 * redis sample store.
 *
 * @param {String} absolutePath - The absolutePath of the subject
 */
function removeFromRedis(absolutePath) {
  redisOps.deleteKey(subjectType, absolutePath);
  redisOps.deleteKeys(sampleType, subjectType, absolutePath);
} // removeFromRedis

module.exports = {
  removeFromRedis,
  throwNotMatchError,
  updateParentFields,
  validateParentField,
};
