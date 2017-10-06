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

const pub = require('../../cache/redisCache').client.pubPerspective;
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
 * Takes a sample instance and enhances it with the subject instance and
 * aspect instance
 * @param {Sequelize} seq - A reference to Sequelize to have access to the
 * the Promise class.
 * @param {Instance} inst - The Sample Instance.
 * @returns {Promise} - Returns a promise which resolves to sample instance
 * enhanced with subject instance and aspect instance information.
 */
function augmentSampleWithSubjectAspectInfo(seq, inst) {
  return new seq.Promise((resolve, reject) => {
    inst.getSubject()
    .then((sub) => {
      inst.dataValues.subject = sub;

      // adding absolutePath to sample instance
      if (sub) {
        inst.dataValues.absolutePath = sub.absolutePath;
      }

      inst.subject = sub;
    }).then(() => inst.getAspect())
    .then((asp) => {
      inst.dataValues.aspect = asp;
      resolve(inst);
    })
    .catch((err) => reject(err));
  });
} // augmentSampleWithSubjectAspectInfo

/**
 * This function checks if the aspect and subject associated with the sample
 * are published or not. It resolves to true when both the aspect and
 * the subject are published or false otherwise.
 *
 * @param {Sequelize} seq - A reference to Sequelize to have access to the
 * the Promise class.
 * @param {Instance} inst - The Sample Instance.
 * @returns {Promise} - Returns  a promise which resolves to true when both the
 * aspect and the subject are published or false otherwise.
 */
function sampleAspectAndSubjectArePublished(seq, inst) {
  return new seq.Promise((resolve, reject) => {
    let asp;
    let sub;
    inst.getSubject()
    .then((s) => {
      sub = s;
    })
    .then(() => inst.getAspect())
    .then((a) => {
      asp = a;
    })
    .then(() => resolve(sub && asp && sub.isPublished && asp.isPublished))
    .catch((err) => reject(err));
  });
} // sampleAspectAndSubjectArePublished

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
 * This function returns an object to be published via redis channel
 * @param  {Object} inst  -  Model instance
  @param  {[Array]} changedKeys - An array containing the fields of the model
 * that were changed
 * @param  {[Array]} ignoreAttributes An array containing the fields of the
 * model that should be ignored
 * @returns {Object} - Returns an object that is ready to be published Or null
 * if there are no changedfields.
 */
function prepareToPublish(inst, changedKeys, ignoreAttributes) {
  // prepare the data iff changed fields are not in ignoreAttributes
  const ignoreSet = new Set(ignoreAttributes);
  for (let i = 0; i < changedKeys.length; i++) {
    if (!ignoreSet.has(changedKeys[i])) {
      return {
        old: inst._previousDataValues,
        new: inst.get(),
      };
    }
  }

  return null;
} // prepareToPublish

/**
 * This function publishes an created, updated or a deleted model instance to
 * the redis channel and returns the object that was published
 *
 * @param  {Object} inst - Model instance to be published
 * @param  {String} event  - Type of the event that is being published
 * @param  {[Array]} changedKeys - An array containing the fields of the model
 * that were changed
 * @param  {[Array]} ignoreAttributes An array containing the fields of the
 * model that should be ignored
 * @returns {Object} - object that was published
 */
function publishChange(inst, event, changedKeys, ignoreAttributes) {
  const obj = {};
  obj[event] = inst.get();

  /**
   * The shape of the object required for update events are a bit different.
   * changedKeys and ignoreAttributes are passed in as arrays by the
   * afterUpdate hooks of the models, which are passed to the prepareToPublish
   * to get the object just for update events.
   */
  if (Array.isArray(changedKeys) && Array.isArray(ignoreAttributes)) {
    obj[event] = prepareToPublish(inst, changedKeys, ignoreAttributes);
  }

  if (obj[event]) {
    pub.publish(channelName, JSON.stringify(obj));
  }

  return obj;
} // publishChange

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

module.exports = {
  checkDuplicatesInStringArray,
  dbconf,
  setIsDeleted,
  publishChange,
  sampleAspectAndSubjectArePublished,
  augmentSampleWithSubjectAspectInfo,
  validateJsonSchema,
  createDBLog,
  changeType,
  validateObject,
  validateContextDef,
}; // exports
