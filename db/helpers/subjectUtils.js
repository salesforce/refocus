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

/**
 * Validates a given field ie. parentAbsolutePath, parentId.
 * throws error if parent subject not found, or is child subject.
 * Else returns parent subject.
 *
 * @param {String} parentFieldValue ie. inst.parentAbsolutePath OR inst.parentId
 * @param {String} fieldValue ie. inst.absolutePath OR inst.id
 * @param {String} fieldName ie. absolutePath OR id
 * @returns {Promise} contains parent subject
 */
function validateParentField(Subject, parentFieldValue, fieldValue, fieldName)  {
  return Subject.scope({
    method: [fieldName, parentFieldValue],
  }).find()
  .then((parent) => {
    if (!parent) {
      throw new ParentSubjectNotFound({
        message: parentFieldValue + ' not found.',
      });
    }

    // if PAP === absolutePath || PID === id, throw cannot self parent error.
    if (parentFieldValue === fieldValue) {
      throw new IllegalSelfParenting({
        message: 'parentAbsolutePath cannot equal absolutePath: ' + fieldValue,
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
 * @param {String} parentId The new parentId
 * @param {String} parentAbsolutePath The new parentAbsolutePath
 * for new absolutePath
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

module.exports = {
  validateParentField,
  updateParentFields,
  throwNotMatchError,
};
