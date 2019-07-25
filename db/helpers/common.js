/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/common.js
 *
 * Common utility file used by all the models
 */
'use strict'; // eslint-disable-line strict

const dbconf = require('../../config').db;
const channelName = require('../../config').redis.perspectiveChannelName;
const joi = require('joi');
const ValidationError = require('../dbErrors').ValidationError;

// jsonSchema keys for relatedLink
const jsonSchemaProperties = {
  relatedlink: ['name', 'url'],
};

// change types for logs.
const changeType = {
  add: 'ADD',
  upd: 'UPDATE',
  del: 'DELETE',
};

/**
 * Returns whether there are duplicates in a given flat array
 *
 * ie. [a, b, c, c, a] => true
 * ie. [a, b, c] => false
 *
 * @param {Array} arr Array of strings
 * @returns {Boolean} Does the input array contain duplicates
 */
function checkDuplicatesInStringArray(arr) {
  if (!arr || !arr.length) {
    return false;
  }

  // if all the elements are distinct set size === arr.length
  const _set = new Set(arr);
  return _set.size !== arr.length;
}

/**
 * Create db log. Changed values will be empty in case of post.
 * @param  {Object} inst  -  Model instance in case of post,
 * { old: old_inst, new: new_inst} in case of update
 * @param  {Object} eventType  - event type
 * @param  {Array} changedKeys - An array containing the fields of the model
 * that were changed
 * @param  {Array} ignoreAttributes - An array containing the fields of the
 * model that should be ignored
 */
function createDBLog(inst, eventType, changedKeys, ignoreAttributes) {
  let objNameLog;
  let objIDLog;

  // get name and id of instance
  if (inst.old) {
    objNameLog = `Name=${inst.old.name}`;
  } else {
    objNameLog = `Name=${inst.name}`;
  }

  if (inst.old) {
    objIDLog = ` ID=${inst.old.id}`;
  } else {
    objIDLog = ` ID=${inst.id}`;
  }

  const instance = `${objNameLog} ${objIDLog}`;
  let changedVals = '';

  // If an update, log all changed attributes
  if (Array.isArray(changedKeys) && Array.isArray(ignoreAttributes)) {
    const ignoreSet = new Set(ignoreAttributes);

    for (let i = 0; i < changedKeys.length; i++) {
      if (!ignoreSet.has(changedKeys[i])) {
        changedVals += `${changedKeys[i]}:` +
        `${inst._previousDataValues[changedKeys[i]]} => ` +
        `${inst.get()[changedKeys[i]]} ;`;
      }
    }
  }

  // TODO: revisit this to fix logDB
  // logDB(instance, eventType, changedVals);
}

/**
 * The Json format of the relatedLink is validated against a pre-defined
 * schema. Validation to check the uniqueness of relatedLinks by name is
 * done
 * @param  {Object} value - Array of Json object that needed to be validated
 * against a predefined schema
 * @returns {undefined} OK
 */
function validateJsonSchema(value) {
  const relLinkNameSet = new Set();

  for (let i = 0; i < value.length; i++) {
    const relLink = value[i];
    if (Object.keys(relLink).length > jsonSchemaProperties.relatedlink.length) {
      throw new Error('A relatedlinks can only have' +
        jsonSchemaProperties.relatedlink.length + ' properties: ' +
        jsonSchemaProperties.relatedlink);
    }

    if (relLinkNameSet.has(relLink.name)) {
      throw new Error('Name of the relatedlinks should be unique.');
    } else {
      relLinkNameSet.add(relLink.name);
    }
  }
}

/**
 * Sets the instance's isDeleted field.
 *
 * @param {Promise} Promise -The Sequelize Promise class
 * @param {Instance} inst - The instance being deleted
 * @returns {Promise} which resolves undefined if OK or rejects if an error
 *  was encountered trying to update the instance's isDeleted field
 */
function setIsDeleted(Promise, inst) {
  return new Promise((resolve, reject) =>
    inst.update({ isDeleted: Date.now() })
    .then(() => resolve())
    .catch((err) => reject(err)));
} // setIsDeleted

/**
 * Validates a function against a schema. It throws an error if the object
 * does not match the schema. The revalidator library is used for this purpose
 * @param  {Object} object - The input object to be instered into the database
 * @param  {Object} schema - The schema against which the object is to be
 * validated
 * @throws {ValidationError} If the object does not conform to the schema
 */
function validateObject(object, schema) {
  if (object === null || object === undefined) {
    return;
  }

  const result = joi.validate(object, schema);
  if (result.error) {
    throw new ValidationError(result.error.message);
  }
} // validateObject

/**
 * A custom validator to validate the context definition object
 * @param  {Object} contextDef - A context definition object
 * @param {Array} requiredProps - Any array of the required field names
 * @throws {ValidationError} If the object does not pass the validation.
 */
function validateContextDef(contextDef, requiredProps) {
  if (contextDef === null || contextDef === undefined) {
    return;
  }

  const message = requiredProps.join(' and ');
  const keys = Object.keys(contextDef);
  for (let i = 0; i < keys.length; i++) {
    const nestedKeys = new Set(Object.keys(contextDef[keys[i]]));
    const intersection = new Set(requiredProps.filter((element) =>
      nestedKeys.has(element)));
    if (intersection.size !== requiredProps.length) {
      throw new ValidationError(message + ' is required');
    }
  }
} // validateContextDef

/**
 * Determine whether the tags have changed by doing a deep comparison
 * @param  {Object} inst - db instance
 * @returns {Boolean}
 */
function tagsChanged(inst) {
  let prevTags = inst.previous('tags') || [];
  let currTags = inst.get('tags') || [];
  if (!inst.changed('tags')) {
    return false;
  } else if (prevTags.length !== currTags.length) {
    return true;
  } else {
    prevTags = prevTags.map(t => t.toLowerCase()).sort();
    currTags = currTags.map(t => t.toLowerCase()).sort();
    return !prevTags.every((prevVal, i) => prevVal === currTags[i]);
  }
} // tagsChanged

module.exports = {
  checkDuplicatesInStringArray,
  dbconf,
  setIsDeleted,
  validateJsonSchema,
  createDBLog,
  changeType,
  validateObject,
  validateContextDef,
  tagsChanged,
}; // exports
