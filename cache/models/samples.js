/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * cache/models/samples.js
 */
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const logInvalidHmsetValues = require('../../utils/common')
  .logInvalidHmsetValues;
const helper = require('../../api/v1/helpers/nouns/samples');
const u = require('../../api/v1/helpers/verbs/utils');
const modelUtils = require('./utils');
const sampleStore = require('../sampleStore');
const redisClient = require('../redisCache').client.sampleStore;
const constants = sampleStore.constants;
const redisErrors = require('../redisErrors');
const apiErrors = require('../../api/v1/apiErrors');
const sampleUtils = require('../../db/helpers/sampleUtils');
const dbConstants = require('../../db/constants');
const redisOps = require('../redisOps');
const db = require('../../db/index');
const fu = require('../../api/v1/helpers/verbs/findUtils.js');
const aspectType = redisOps.aspectType;
const subjectType = redisOps.subjectType;
const sampleType = redisOps.sampleType;
const commonUtils = require('../../utils/common');
const sampleNameSeparator = '|';
const logger = require('winston');

const sampFields = {
  PROVIDER: 'provider',
  USER: 'user',
  MSG_BODY: 'messageBody',
  MSG_CODE: 'messageCode',
  NAME: 'name',
  VALUE: 'value',
  RLINKS: 'relatedLinks',
  STATUS: 'status',
  PRVS_STATUS: 'previousStatus',
  STS_CHNGED_AT: 'statusChangedAt',
  CREATED_AT: 'createdAt',
  UPD_AT: 'updatedAt',
  ASP_ID: 'aspectId',
  SUBJ_ID: 'subjectId',
};
const sampleFieldsArr = Object.keys(sampFields).map(
  (field) => sampFields[field]
);

const embeddedAspectFields = [
  'id', 'description', 'isPublished', 'helpEmail', 'helpUrl', 'name', 'timeout',
  'criticalRange', 'warningRange', 'infoRange', 'okRange', 'valueLabel',
  'valueType', 'relatedLinks', 'tags', 'rank',
];
const embeddedSubjectFields = [
  'absolutePath', 'createdAt', 'createdBy', 'description', 'helpEmail',
  'helpUrl', 'hierarchyLevel', 'id', 'isPublished', 'name',
  'parentAbsolutePath', 'parentId', 'relatedLinks', 'sortBy', 'tags',
  'updatedAt',
];

const ZERO = 0;
const ONE = 1;
const TWO = 2;

/**
 * Parses a sample name into its separate parts, i.e. the subject absolute
 * path and the aspect name.
 *
 * @param {String} name - The sample name
 * @returns {Object} containing subject.absolutePath and aspect.name
 * @throws {ResourceNotFoundError} if the name cannot be split in two using
 *  sampleNameSeparator
 */
function parseName(name) {
  const retval = {
    subject: { absolutePath: undefined },
    aspect: { name: undefined },
  };
  const arr = (name || '').split(sampleNameSeparator);
  if (arr.length === 2) {
    retval.subject.absolutePath = arr[0];
    retval.aspect.name = arr[1];
    return retval;
  }

  logger.error(`cache/models/samples.parseName|Invalid sample name "${name}"`);
  console.trace(); // eslint-disable-line no-console
  throw new redisErrors.ResourceNotFoundError({
    explanation: `Invalid sample name "${name}"`,
  });
} // parseName

/**
 * Checks if the user has the permission to perform the write operation on the
 * sample or not.

 * @param  {String}  aspect - Aspect object
 * @param  {String}  userName -  User performing the operation
 * @param  {Boolean} isBulk   - Flag to indicate if the action is a bulk
 *  operation or not
 * @returns {Promise} - which resolves to true if the user has write permission
 */
function checkWritePermission(aspect, userName, isBulk) {
  let isWritable = true;
  if (aspect.writers && aspect.writers.length) {
    isWritable = aspect.writers.includes(userName);
  }

  if (!isWritable) {
    const err = new redisErrors.UpdateDeleteForbidden({
      explanation: `User "${userName}" does not have write permission ` +
        `for aspect "${aspect.name}"`,
    });
    if (isBulk) {
      return Promise.reject({ isFailed: true, explanation: err });
    }

    return Promise.reject(err);
  }

  // If we got this far, the user has write permission on this aspect.
  return Promise.resolve(true);
} // checkWritePermission

/**
 * Convert array strings to Json for sample and aspect, then attach aspect to
 * sample.
 *
 * @param  {Object} sampleObj - Sample object from redis
 * @param  {Object} aspectObj - Aspect object from redis
 * @returns {Object} - Sample object with aspect attached
 */
function cleanAddAspectToSample(sampleObj, aspectObj) {
  let sampleRes = {};
  sampleRes = sampleStore.arrayObjsStringsToJson(sampleObj,
    constants.fieldsToStringify.sample);
  const aspect = sampleStore.arrayObjsStringsToJson(aspectObj,
    constants.fieldsToStringify.aspect);
  if (aspect) {
    modelUtils.cleanQueryBodyObj(aspect, embeddedAspectFields);
    sampleStore.convertAspectStrings(aspect);
    sampleRes.aspect = aspect;
  }

  return sampleRes;
} // cleanAddAspectToSample

/**
 * Convert array strings to Json for sample and subject, then attach subject to
 * sample.
 *
 * @param  {Object} sampleObj - Sample object from redis
 * @param  {Object} subjectObj - Subject object from redis
 * @returns {Object} - Sample object with subject attached
 */
function cleanAddSubjectToSample(sampleObj, subjectObj) {
  let sampleRes = {};
  sampleRes = sampleStore.arrayObjsStringsToJson(sampleObj,
    constants.fieldsToStringify.sample);
  const subject = sampleStore.arrayObjsStringsToJson(subjectObj,
    constants.fieldsToStringify.subject);
  if (subject) {
    modelUtils.cleanQueryBodyObj(subject, embeddedSubjectFields);
    sampleStore.convertSubjectStrings(subject);
    sampleRes.subject = subject;
  }

  return sampleRes;
} // cleanAddSubjectToSample

/**
 * Create properties array with fields to update/create. Value is empty string
 * if new object being created. If value is present, then calculate status.
 * Update the status, previousStatus and changedAt fields if:
 *   a) sampObj is not present, or
 *   b) sampObj is present and previousStatus != current status.
 *
 * @param  {Object} qbObj - Query body object
 * @param  {Object} sampObj - Sample object
 * @param  {Object} aspectObj - Aspect object
 */
function createSampHsetCommand(qbObj, sampObj, aspectObj) {
  modelUtils.cleanQueryBodyObj(qbObj, sampleFieldsArr); // remove extra fields
  let value;
  if (qbObj[sampFields.VALUE]) {
    value = qbObj[sampFields.VALUE];
  } else if (!sampObj) {
    value = ''; // default value
  }

  if (value !== undefined) {
    qbObj[sampFields.VALUE] = value;
    const status = sampleUtils.computeStatus(aspectObj, value);

    if (!sampObj || (sampObj && (sampObj[sampFields.STATUS] !== status))) {
      const prevStatus = sampObj ? sampObj[sampFields.STATUS] :
        dbConstants.statuses.Invalid;
      qbObj[sampFields.PRVS_STATUS] = prevStatus;
      qbObj[sampFields.STS_CHNGED_AT] = new Date().toISOString();
      qbObj[sampFields.STATUS] = status;
    }
  }

  let rlinks;

  // if related link is passed in query object
  if (qbObj[sampFields.RLINKS]) {
    rlinks = qbObj[sampFields.RLINKS];
  } else if (!sampObj) { // if we are creating new sample
    rlinks = []; // default value
  }

  if (rlinks) {
    qbObj[sampFields.RLINKS] = JSON.stringify(rlinks);
  }

  const dateNow = new Date().toISOString();
  if (!sampObj) { // new sample
    qbObj[sampFields.CREATED_AT] = dateNow;
  }

  qbObj[sampFields.UPD_AT] = dateNow;
} // createSampHsetCommand

/**
 * Throws custom error object based on object type for sample upsert.
 *
 * @param  {string}  objectType - Object type - subject or aspect
 * @param  {Boolean} isBulk - If the caller method is bulk upsert
 * @throws {Object} Error object
 */
function handleUpsertError(objectType, isBulk) {
  const err = new redisErrors.ResourceNotFoundError({
    explanation: `${objectType} not found`,
  });

  if (isBulk) {
    const errObj = { isFailed: true, explanation: err };
    throw errObj;
  }

  throw err;
} // handleUpsertError

/**
 * Returns a sample object along with its related aspect; given a sample name.
 * @param  {String} sampleName - Name of the sample
 * @returns {Object} - Sample Object
 */
function getOneSample(sampleName) {
  const parsedSampleName = parseName(sampleName); // throw is invalid name
  const commands = [];
  commands.push([
    'hgetall',
    sampleStore.toKey(constants.objectType.sample, sampleName),
  ]);

  // command to get aspect
  commands.push([
    'hgetall',
    sampleStore.toKey(constants.objectType.aspect,
      parsedSampleName.aspect.name),
  ]);

  return redisClient.batch(commands).execAsync();
} // getOneSample

/**
 * Upsert a sample. If subject exists, get aspect and sample. If aspect exists,
 * create fields array with values need to be set for sample in redis. Add
 * aspect name to subject set, add aspect key to sample set and update/create
 * sample hash. We use hset which updates a sample if exists, else creates a
 * new one.
 *
 * @param  {Object} sampleQueryBodyObj - Query Body Object for a sample
 * @param  {Boolean} isBulk - If the caller method is bulk upsert
 * @param {Object} user - The user performing the write operation
 * @returns {Object} - Updated sample
 */
function upsertOneSample(sampleQueryBodyObj, isBulk, user) {
  const userName = user ? user.name : false;
  const sampleName = sampleQueryBodyObj.name;
  let parsedSampleName = {};
  try {
    parsedSampleName = parseName(sampleName.toLowerCase());
  } catch (err) {
    if (isBulk) {
      return Promise.reject({ isFailed: true, explanation: err });
    }

    return Promise.reject(err);
  }

  const sampleKey = sampleStore.toKey(constants.objectType.sample, sampleName);
  const absolutePath = parsedSampleName.subject.absolutePath;
  const aspectName = parsedSampleName.aspect.name;
  const subjKey = sampleStore.toKey(constants.objectType.subject, absolutePath);
  let aspectObj = {};
  let subject;
  let aspect;
  let sample;

  /*
   * If any of these promises throws an error, we drop through to the catch
   * block and return an error. Otherwise, we return the sample.
   */
  return checkWritePermission(aspectName, userName, isBulk)
  .then(() => Promise.all([
    redisClient.hgetallAsync(subjKey),
    redisClient.hgetallAsync(
      sampleStore.toKey(constants.objectType.aspect, aspectName)),
    redisClient.hgetallAsync(sampleKey),
  ])
  .then((responses) => {
    [subject, aspect, sample] = responses;
    if (!subject || subject.isPublished === 'false') {
      handleUpsertError(constants.objectType.subject, isBulk);
    }

    if (!aspect || aspect.isPublished === 'false') {
      handleUpsertError(constants.objectType.aspect, isBulk);
    }

    sampleQueryBodyObj.subjectId = subject.id;
    sampleQueryBodyObj.aspectId = aspect.id;
    aspectObj = sampleStore.arrayObjsStringsToJson(aspect,
      constants.fieldsToStringify.aspect);
    return checkWritePermission(aspectObj, userName, isBulk);
  })
  .then(() => {
    // sampleQueryBodyObj updated with fields
    createSampHsetCommand(sampleQueryBodyObj, sample, aspectObj);

    if (sample) { // if sample exists, just update sample
      delete sampleQueryBodyObj.name; // to avoid updating sample name
      logInvalidHmsetValues(sampleKey, sampleQueryBodyObj);
      return redisClient.hmsetAsync(sampleKey, sampleQueryBodyObj);
    }

    /*
     * Otherwise the sample is new. Set the name to be the combination of
     * subject absolutePath and aspect name.
     */
    sampleQueryBodyObj.name = subject.absolutePath + '|' + aspectObj.name;

    // Add the provider and user fields.
    if (user) {
      sampleQueryBodyObj.provider = user.id;
      sampleQueryBodyObj.user = JSON.stringify({
        name: user.name,
        email: user.email,
        profile: {
          name: user.profile.name,
        },
      });
    }

    const subaspMapKey = sampleStore.toKey(constants.objectType.subAspMap,
      absolutePath);

    /*
     * Add aspect name to subject set. Add sample key to sample set.
     * Create/update hash of sample.
     */
    logInvalidHmsetValues(sampleKey, sampleQueryBodyObj);
    return redisClient.batch([
      ['sadd', subaspMapKey, aspectName],
      ['sadd', constants.indexKey.sample, sampleKey],
      ['hmset', sampleKey, sampleQueryBodyObj],
    ]).execAsync();
  }))
  .then(() => redisClient.hgetallAsync(sampleKey))
  .then((updatedSamp) => {
    if (!updatedSamp.name) {
      updatedSamp.name = subject.absolutePath + '|' + aspectObj.name;
    }

    return cleanAddAspectToSample(updatedSamp, aspectObj);
  })
  .then((updatedSamp) => {
    if (featureToggles.isFeatureEnabled('preAttachSubject')) {
      return cleanAddSubjectToSample(updatedSamp, subject);
    }

    return updatedSamp;
  })
  .catch((err) => {
    if (isBulk) {
      return err;
    }

    throw err;
  });
} // upsertOneSample

module.exports = {

  /**
   * Delete sample. Get sample. If found, get aspect, delete sample entry from
   * sample index, delete aspect from subject set and delete sample hash. If
   * sample not found, throw Not found error.
   * @param  {String} sampleName - Sample name
   * @param {String} userName - The user performing the write operation
   * @returns {Promise} - Resolves to a sample object
   */
  deleteSample(sampleName, userName) {
    const cmds = [];
    let parsedSampleName = {};
    try {
      parsedSampleName = parseName(sampleName.toLowerCase());
    } catch (err) {
      return Promise.reject(err);
    }

    const subjAbsPath = parsedSampleName.subject.absolutePath;
    const aspName = parsedSampleName.aspect.name;
    let sampObjToReturn;
    let aspect;
    return redisOps.getHashPromise(sampleType, sampleName)
    .then((sampleObj) => {
      if (!sampleObj) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Sample not found.',
        });
      }

      sampObjToReturn = sampleObj;

      cmds.push(redisOps.getHashCmd(aspectType, aspName));

      // get the aspect to attach it to the sample
      return redisOps.getHashPromise(aspectType, aspName);
    })
    .then((aspObj) => {
      if (!aspObj) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Aspect not found.',
        });
      }

      aspect = sampleStore.arrayObjsStringsToJson(
        aspObj, constants.fieldsToStringify.aspect
      );

      return checkWritePermission(aspect, userName);
    })
    /*
     * Set up and execute the commands to:
     * (1) delete the sample entry from the master list of sample index,
     * (2) delete the aspect from the subAspMap,
     * (3) delete the sample hash.
     */
    .then(() => {
      cmds.push(redisOps.delKeyFromIndexCmd(sampleType, sampleName));
      cmds.push(redisOps.delAspFromSubjSetCmd(subjAbsPath, aspName));
      cmds.push(redisOps.delHashCmd(sampleType, sampleName));
      return redisOps.executeBatchCmds(cmds);
    })
    .then(() => redisOps.executeBatchCmds(cmds))
    /* Attach aspect and links to sample. */
    .then(() => cleanAddAspectToSample(sampObjToReturn, aspect));
  }, // deleteSample

  /**
   * Delete sample related links
   * @param  {Object} params - Request parameters
   * @param {String} userName - The user performing the write operation
   * @returns {Promise} - Resolves to a sample object
   */
  deleteSampleRelatedLinks(params, userName) {
    const sampleName = params.key.value;
    const parsedSampleName = parseName(sampleName);
    const aspectName = parsedSampleName.aspect.name;
    let currSampObj;
    let aspectObj;
    return redisOps.getHashPromise(sampleType, sampleName)
    .then((sampObj) => {
      if (!sampObj) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Sample not found.',
        });
      }

      currSampObj = sampObj;
      return redisOps.getHashPromise(aspectType, aspectName);
    })
    .then((aspObj) => {
      if (!aspObj) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Aspect not found.',
        });
      }

      aspectObj = sampleStore.arrayObjsStringsToJson(
        aspObj, constants.fieldsToStringify.aspect
      );

      return checkWritePermission(aspectObj, userName);
    })
    .then(() => {
      let updatedRlinks = [];
      if (params.relName) { // delete only this related link
        const currRlinks = JSON.parse(currSampObj.relatedLinks);
        updatedRlinks = u.deleteAJsonArrayElement(
          currRlinks, params.relName.value
        );
      }

      // if no change in related links, then return the object.
      if (JSON.stringify(updatedRlinks) ===
        JSON.stringify(currSampObj.relatedLinks)) {
        Promise.resolve(cleanAddAspectToSample(currSampObj, aspectObj));
      }

      const hmsetObj = {};
      hmsetObj.relatedLinks = updatedRlinks;
      hmsetObj.updatedAt = new Date().toISOString();

      // stringify arrays
      constants.fieldsToStringify.sample.forEach((field) => {
        if (hmsetObj[field]) {
          hmsetObj[field] = JSON.stringify(hmsetObj[field]);
        }
      });

      return redisOps.setHashMultiPromise(sampleType, sampleName, hmsetObj);
    })
    .then(() => redisOps.getHashPromise(sampleType, sampleName))
    .then((updatedSamp) => cleanAddAspectToSample(updatedSamp, aspectObj));
  }, // deleteSampleRelatedLinks

  /**
   * Patch sample. First get sample. If not found, throw error. Get aspect.
   * Update request body with required fields based on value and related links
   * if needed. Update sample. Then get updated sample, attach aspect and return
   * response. Note: Message body and message code will be updated if provided,
   * else no fields for message body/message code in redis object.
   *
   * @param  {Object} params - Request parameters
   * @param {String} userName - The user performing the write operation
   * @returns {Promise} - Resolves to a sample object
   */
  patchSample(params, userName) {
    const reqBody = params.queryBody.value;
    const sampleName = params.key.value;
    const parsedSampleName = parseName(sampleName.toLowerCase());
    const subjectAbsolutePath = parsedSampleName.subject.absolutePath;
    const aspectName = parsedSampleName.aspect.name;
    let currSampObj;
    let aspectObj;
    return checkWritePermission(aspectName, userName)
    .then(() => redisOps.getHashPromise(sampleType, sampleName))
    .then((sampObj) => {
      if (!sampObj) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Sample not found.',
        });
      }

      currSampObj = sampObj;

      return redisOps.getHashPromise(aspectType, aspectName);
    })
    .then((aspObj) => {
      if (!aspObj || (aspObj.isPublished == 'false')) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Aspect not found.',
        });
      }

      modelUtils.cleanQueryBodyObj(reqBody, sampleFieldsArr);
      aspectObj = sampleStore.arrayObjsStringsToJson(
        aspObj, constants.fieldsToStringify.aspect
      );

      return redisOps.getHashPromise(subjectType, subjectAbsolutePath);
    })
    .then((subjObj) => {
      if (!subjObj || (subjObj.isPublished == 'false')) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Subject not found.',
        });
      }

      return checkWritePermission(aspectObj, userName);
    })
    .then(() => {
      if (reqBody.value) {
        const status = sampleUtils.computeStatus(aspectObj, reqBody.value);
        if (currSampObj[sampFields.STATUS] !== status) {
          reqBody[sampFields.PRVS_STATUS] = currSampObj[sampFields.STATUS];
          reqBody[sampFields.STS_CHNGED_AT] = new Date().toISOString();
          reqBody[sampFields.STATUS] = status;
        }

        reqBody[sampFields.UPD_AT] = new Date().toISOString();
      }

      if (reqBody.relatedLinks) {
        reqBody[sampFields.RLINKS] = reqBody.relatedLinks;
      }

      // stringify arrays
      constants.fieldsToStringify.sample.forEach((field) => {
        if (reqBody[field]) {
          reqBody[field] = JSON.stringify(reqBody[field]);
        }
      });
      return redisOps.setHashMultiPromise(sampleType, sampleName, reqBody);
    })
    .then(() => redisOps.getHashPromise(sampleType, sampleName))
    .then((updatedSamp) => {
      parseName(updatedSamp.name); // throw if invalid name
      return cleanAddAspectToSample(updatedSamp, aspectObj);
    })
    .catch((err) => {
      throw err;
    });
  }, // patchSample

  /**
   * Post sample. First get subject from db, then get aspect from db, then try
   * to get sample from Redis. Is sample found, throw error, else create
   * sample. Update sample index and subject set as well.
   * @param  {Object} reqBody - The sample object to be created
   * @param {Object} userObj - The user performing the write operation
   * @returns {Promise} - Resolves to a sample object
   */
  postSample(reqBody, userObj) {
    const userName = userObj ? userObj.name : false;
    const cmds = [];
    let subject;
    let sampleName;
    let aspectObj;

    return db.Subject.findById(reqBody.subjectId)
    .then((subjFromDb) => {
      if (!subjFromDb || !subjFromDb.isPublished) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: `Subject "${reqBody.subjectId}" not found.`,
        });
      }

      subject = subjFromDb;
      return db.Aspect.findById(reqBody.aspectId);
    })
    .then((aspFromDb) => {
      if (!aspFromDb || !aspFromDb.isPublished) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: `Aspect "${reqBody.aspectId}" not found.`,
        });
      }

      aspectObj = aspFromDb;
      return aspFromDb.isWritableBy(userName);
    })
    .then((isWritable) => {
      sampleName = subject.absolutePath + '|' + aspectObj.name;
      if (!isWritable) {
        const err = new redisErrors.UpdateDeleteForbidden({
          explanation: `User "${userName}" does not have write permission ` +
            `for aspect "${aspectObj.name}"`,
        });
        return Promise.reject(err);
      }

      return redisOps.getHashPromise(sampleType, sampleName);
    })
    .then((sampFromRedis) => {
      if (sampFromRedis) {
        throw new apiErrors.DuplicateResourceError({
          explanation: `Sample "${sampFromRedis.name}" already exists.`,
        });
      }

      modelUtils.cleanQueryBodyObj(reqBody, sampleFieldsArr);
      reqBody.name = sampleName;
      const value = reqBody.value || '';
      reqBody[sampFields.STATUS] = sampleUtils.computeStatus(aspectObj, value);
      reqBody[sampFields.VALUE] = value;
      if (reqBody.relatedLinks) {
        reqBody[sampFields.RLINKS] = JSON.stringify(reqBody.relatedLinks);
      } else {
        reqBody[sampFields.RLINKS] = '[]';
      }

      // defaults
      const dateNow = new Date().toISOString();
      reqBody[sampFields.PRVS_STATUS] = dbConstants.statuses.Invalid;
      reqBody[sampFields.STS_CHNGED_AT] = dateNow;
      reqBody[sampFields.UPD_AT] = dateNow;
      reqBody[sampFields.CREATED_AT] = dateNow;
      if (userObj) {
        reqBody[sampFields.PROVIDER] = userObj.id;
        reqBody[sampFields.USER] = JSON.stringify({
          name: userName,
          email: userObj.email,
          profile: {
            name: userObj.profile.name,
          },
        });
      }

      // add the aspect to the subjectSet
      cmds.push(redisOps.addAspectInSubjSetCmd(
        subject.absolutePath, aspectObj.name)
      );

      // add sample to the master list of sample index
      cmds.push(redisOps.addKeyToIndexCmd(sampleType, sampleName));

      // create a sample set to store the values
      cmds.push(redisOps.setHashMultiCmd(sampleType, sampleName, reqBody));

      return redisOps.executeBatchCmds(cmds);
    })
    .then(() => redisOps.getHashPromise(sampleType, sampleName))
    .then((sampleObj) => sampleStore.arrayObjsStringsToJson(
      sampleObj, constants.fieldsToStringify.sample));
  }, // postSample

  /**
   * Put sample. First get sample. If not found, throw error. Get aspect.
   * Update request body with required fields based on value and related links
   * if needed. Delete message body and message code fields from hash
   * if not provided because they will be null. Then update sample.
   *
   * @param  {Object} params - Request parameters
   * @param {String} userName - The user performing the write operation
   * @returns {Promise} - Resolves to a sample object
   */
  putSample(params, userName) {
    const reqBody = params.queryBody.value;
    const sampleName = params.key.value;
    const parsedSampleName = parseName(sampleName);
    const subjectAbsolutePath = parsedSampleName.subject.absolutePath;
    const aspectName = parsedSampleName.aspect.name;
    let currSampObj;
    let aspectObj;
    return redisOps.getHashPromise(sampleType, sampleName)
    .then((sampObj) => {
      if (!sampObj) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Sample not found.',
        });
      }

      currSampObj = sampObj;
      return redisOps.getHashPromise(aspectType, aspectName);
    })
    .then((aspObj) => {
      if (!aspObj || (aspObj.isPublished == 'false')) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Aspect not found.',
        });
      }

      aspectObj = sampleStore.arrayObjsStringsToJson(
        aspObj, constants.fieldsToStringify.aspect
      );

      return redisOps.getHashPromise(subjectType, subjectAbsolutePath);
    })
    .then((subjObj) => {
      if (!subjObj || (subjObj.isPublished == 'false')) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Subject not found.',
        });
      }

      return checkWritePermission(aspectObj, userName);
    })
    .then(() => {
      modelUtils.cleanQueryBodyObj(reqBody, sampleFieldsArr);
      let value = '';
      if (reqBody.value) {
        value = reqBody.value;
      }

      // change these only if status is updated
      const status = sampleUtils.computeStatus(aspectObj, value);
      if (currSampObj[sampFields.STATUS] !== status) {
        reqBody[sampFields.PRVS_STATUS] = currSampObj[sampFields.STATUS];
        reqBody[sampFields.STS_CHNGED_AT] = new Date().toISOString();
        reqBody[sampFields.STATUS] = status;
      }

      // We have a value, so update value and updated_at always.
      reqBody[sampFields.VALUE] = value;
      reqBody[sampFields.UPD_AT] = new Date().toISOString();

      if (reqBody.relatedLinks) { // related links
        reqBody[sampFields.RLINKS] = JSON.stringify(reqBody.relatedLinks);
      } else {
        reqBody[sampFields.RLINKS] = '[]';
      }

      const cmds = [];

      // delete fields with future null value
      if (!reqBody.messageBody) {
        cmds.push(
          redisOps.delHashFieldCmd(sampleType, sampleName, sampFields.MSG_BODY)
        );
      }

      if (!reqBody.messageCode) {
        cmds.push(
          redisOps.delHashFieldCmd(sampleType, sampleName, sampFields.MSG_CODE)
        );
      }

      cmds.push(redisOps.setHashMultiCmd(sampleType, sampleName, reqBody));
      return redisOps.executeBatchCmds(cmds);
    })
    .then(() => redisOps.getHashPromise(sampleType, sampleName))
    .then((updatedSamp) => {
      parseName(updatedSamp.name); // throw if invalid name
      return cleanAddAspectToSample(updatedSamp, aspectObj);
    });
  }, // putSample

  getOneSample, // exported for testing only

  /**
   * Retrieves the sample from redis and sends it back in the response. Get
   * sample and corresponsing aspect from redis and then apply field list
   * filter is needed. Then attach aspect to sample and return.
   *
   * @param  {String} params - Req Query parameters
   * @returns {Promise} - Resolves to a sample object
   */
  getSample(params) {
    const sampleName = params.key.value.toLowerCase();
    return getOneSample(sampleName)
    .then((responses) => {
      const sample = responses[ZERO];
      const aspect = responses[ONE];
      if (!sample || !aspect) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Sample/Aspect not found.',
        });
      }

      const opts = modelUtils.getOptionsFromReq(params, helper);
      if (opts.attributes) { // apply fields list filter
        modelUtils.applyFieldListFilter(sample, opts.attributes);
      }

      parseName(sampleName); // throw if invalid name
      const sampleRes = cleanAddAspectToSample(sample, aspect);
      return sampleRes;
    });
  }, // getSample

  /**
   * Finds samples with filter options if provided. We get sample keys from
   * redis using default alphabetical order. Then we apply limit/offset and
   * wildcard expr on sample names. Using filtered keys we get samples and
   * corresponding aspects from redis in an array. We create samples array and
   * { sampleName: aspect object} map from response. Then, we apply wildcard
   * expr (other than name) to samples array, then we sort, then apply
   * limit/offset and finally field list filters. Then, attach aspect to sample
   * using map we created and add to response array.
   *
   * @param  {Object} req - Request object
   * @param  {Object} res - Result object
   * @returns {Promise} - Resolves to a list of all samples objects
   */
  findSamples(req, res) {
    const opts = modelUtils.getOptionsFromReq(req.swagger.params, helper);

    // Add prev/next response links.
    res.links({
      prev: req.originalUrl,
      next: fu.getNextUrl(req.originalUrl, opts.limit, opts.offset),
    });

    /*
     * Send a batch of redis commands to get all the samples sorted
     * lexicographically by key (i.e. sample name). If there are no filters,
     * pass the limit and offset through as part of the initial redis command.
     * If there are filters, we need to load more records so we can return the
     * right number of records in case some get filtered out later.
     */
    const sortArgs = [constants.indexKey.sample, 'alpha'];
    const hasFilters = Object.keys(opts.filter).length > 0;
    if (!hasFilters) {
      sortArgs.push('LIMIT', opts.offset, opts.limit);
    }

    return redisClient.sortAsync(sortArgs)
    /*
     * Prefilter based on sample name, if specified. Then, for each of the
     * remaining sample keys, derive the aspect name and key from the sample
     * name, then add the commands to get the sample details and aspect details
     * from their respective objects in the sample store and execute that
     * batch of commands.
     */
    .then((allSampKeys) => {
      const filteredSampKeys = hasFilters ?
        modelUtils.prefilterKeys(allSampKeys, opts) : allSampKeys;
      const commands = [];
      filteredSampKeys.forEach((sKey) => {
        const aName = sKey.split('|')[ONE];
        const aKey = sampleStore.toKey(constants.objectType.aspect, aName);
        commands.push(['hgetall', sKey]);
        commands.push(['hgetall', aKey]);
      });

      return redisClient.batch(commands).execAsync();
    })
    .then((redisResponses) => { // samples and aspects
      const samples = [];

      // e.g { samplename: asp object }, so that we can attach aspect later
      const sampAspectMap = {};
      for (let num = 0; num < redisResponses.length; num += TWO) {
        samples.push(redisResponses[num]);
        sampAspectMap[redisResponses[num].name] = redisResponses[num + ONE];
      }

      const filteredSamples = modelUtils.applyFiltersOnResourceObjs(samples,
        opts);
      return filteredSamples.map((sample) => {
        if (opts.attributes) { // delete sample fields, hence no return obj
          modelUtils.applyFieldListFilter(sample, opts.attributes);
        }

        const s = cleanAddAspectToSample(sample, sampAspectMap[sample.name]);
        parseName(s.name); // throw if invalid name
        s.apiLinks = u.getApiLinks(s.name, helper, req.method);
        return s;
      });
    });
  }, // findSamples

  /**
   * Upsert sample in Redis.
   * @param  {Object} qbObj - Query body object
   * @param {Object} user - The user performing the write operation
   * @returns {Promise} - Resolves to upserted sample
   */
  upsertSample(qbObj, user) {
    return upsertOneSample(qbObj, false, user);
  },

  /**
   * Upsert multiple samples in Redis concurrently.
   * @param  {Object} sampleQueryBody - Query body object
   * @param {Object} user - The user performing the write operation
   * @param {Array} readOnlyFields - An array of read-only-fields
   * @returns {Array} - Resolves to an array of resolved promises
   */
  bulkUpsertByName(sampleQueryBody, user, readOnlyFields) {
    if (!sampleQueryBody || !Array.isArray(sampleQueryBody)) {
      Promise.resolve([]);
    }

    const promises = sampleQueryBody.map((sampleReq) => {
      // Throw error if sample is upserted with read-only field.
      try {
        commonUtils.noReadOnlyFieldsInReq(sampleReq, readOnlyFields);
        return upsertOneSample(sampleReq, true, user);
      } catch (err) {
        return Promise.resolve({ isFailed: true, explanation: err });
      }
    });

    return Promise.all(promises);
  }, // bulkUpsertByName

  cleanAddSubjectToSample, // export for testing only
  cleanAddAspectToSample, // export for testing only
};
