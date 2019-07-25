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
'use strict'; // eslint-disable-line strict

const sampleEvent = require('../../realtime/constants').events.sample;
const ParentSubjectNotFound = require('../dbErrors')
  .ParentSubjectNotFound;
const ParentSubjectNotMatch = require('../dbErrors')
  .ParentSubjectNotMatch;
const IllegalSelfParenting = require('../dbErrors')
  .IllegalSelfParenting;
const SubjectAlreadyExistsUnderParent = require('../dbErrors')
  .SubjectAlreadyExistsUnderParent;
const redisOps = require('../../cache/redisOps');
const subjectType = redisOps.subjectType;
const subAspMapType = redisOps.subAspMapType;
const publishSample = require('../../realtime/redisPublisher').publishSample;
const Promise = require('bluebird');
const Op = require('sequelize').Op;

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
  return Subject.scope({ method: [fieldName, parentFieldVal] }).findOne()
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
  let newAbsolutePath;
  return Subject.scope({ method:
    ['id', inst.previous('parentId')],
  }).findOne()
  .then((oldParent) => {
    if (oldParent) {
      oldParent.decrement('childCount');
    }

    newAbsolutePath = parentAbsolutePath ?
      parentAbsolutePath + '.' + inst.name : inst.name;
    const whereObj = { where: { absolutePath: { [Op.iLike]: newAbsolutePath } } };
    return Subject.findOne(whereObj);
  })
  .then((subj) => {
    if (subj && subj.id !== inst.id) {
      throw new SubjectAlreadyExistsUnderParent({
        message: newAbsolutePath + ' already exists.',
      });
    }
  })
  .then(() => {
    // update the subject values
    inst.setDataValue('parentId', parentId);
    inst.setDataValue('parentAbsolutePath', parentAbsolutePath);
    inst.setDataValue('absolutePath', newAbsolutePath);
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
 * Deletes all the sample entries related to a subject. The sample delete events
 * are also sent. The following are deleted
 * 1. subject from aspect to subject mappings
 * 2. subject to aspect mapping -> samsto:subaspmap:absolutePath
 * 3. sample entry in samsto:samples (samsto:samples:oldAbsPath|*)
 * 4. sample hash samsto:samples:oldAbsPath|*
 * @param {Object} subject - The subject object
 * @param {Object} seq - The sequelize object
 * @returns {Promise} which resolves to the deleted samples.
 */
function removeRelatedSamples(subject, seq) {
  const now = new Date().toISOString();
  let samples = [];
  return redisOps.deleteSampleKeys(subAspMapType, subject.absolutePath)
  .then((_samples) => {
    samples = _samples;

    // get aspects from subaspmap mapping for this subject
    return redisOps.executeCommand(
      redisOps.getSubjAspMapMembers(subject.absolutePath));
  })
  .then((aspectNames) => redisOps.executeBatchCmds(
    redisOps.deleteSubjectFromAspectResourceMaps(
      aspectNames, subject.absolutePath)))
  .then(() => redisOps.deleteKey(subAspMapType, subject.absolutePath))
  .then(() => {
    const promises = [];

    // publish the samples only if the sequelize object seq is available
    if (seq && samples.length) {
      samples.forEach((sample) => {
        /*
         * publishSample attaches the subject and the aspect by fetching it
         * either from the database or redis. Deleted subject will not be found
         * when called from the afterDestroy and afterUpdate hookes. So, attach
         * the subject here before publishing the sample.
         */
        if (sample) {
          sample.subject = subject;
          sample.updatedAt = now;
          promises.push(publishSample(sample, null, sampleEvent.del,
            seq.models.Aspect));
        }
      });
    }

    return Promise.all(promises);
  });
} // removeRelatedSamples

/**
 * Deletes the subject entry AND multiple possible sample entries from the
 * redis sample store.  The following are deleted
 * 1. subject entry in samsto:subjects (samsto:subject:absolutePath)
 * 2. subject hash samsto:subject:absolutePath
 * 3. subject to aspect mapping -> samsto:subaspmap:absolutePath
 * 4. sample entry in samsto:samples (samsto:samples:absolutePath|*)
 * 5. sample hash samsto:samples:absolutePath|*
 *
 * @param {Object} subject - The subject object
 * @param {Object} seq - The sequelize object
 * @returns {Promise}
 */
function removeFromRedis(subject, seq) {
  return Promise.join(redisOps.deleteKey(subjectType, subject.absolutePath),
    removeRelatedSamples(subject, seq));
} // removeFromRedis

module.exports = {
  removeFromRedis,
  removeRelatedSamples,
  throwNotMatchError,
  updateParentFields,
  validateParentField,
};
