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

const helper = require('../../api/v1/helpers/nouns/samples');
const u = require('../../api/v1/helpers/verbs/utils');
const sampleStore = require('../sampleStore');
const redisClient = require('../redisCache').client.sampleStore;
const constants = sampleStore.constants;
const apiConstants = require('../../api/v1/constants');
const defaults = require('../../config').api.defaults;
const redisErrors = require('../redisErrors');
const sampleUtils = require('../../db/helpers/sampleUtils');
const dbConstants = require('../../db/constants');
const redisOps = require('../redisOps');
const db = require('../../db/index');
const fu = require('../../api/v1/helpers/verbs/findUtils.js');
const aspectType = redisOps.aspectType;
const sampleType = redisOps.sampleType;
const featureToggles = require('feature-toggles');
const commonUtils = require('../../utils/common');
const sampFields = {
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

const ZERO = 0;
const ONE = 1;
const TWO = 2;
const MINUS_ONE = -1;

/**
 * Checks if the user has the permission to perform the write operation on the
 * sample or not
 * @param  {String}  aspect - Aspect object
 * @param  {String}  sample - Sample object
 * @param  {String}  userName -  User performing the operation
 * @param  {Boolean} isBulk   - Flag to indicate if the action is a bulk
 * operation or not
 * @returns {Promise} - which resolves to true if the user has write permission
 */
function checkWritePermission(aspect, sample, userName, isBulk) {
  let isWritable = true;
  if (aspect.writers && aspect.writers.length) {
    isWritable = featureToggles
                        .isFeatureEnabled('enforceWritePermission') ?
                        aspect.writers.includes(userName) : true;
  }

  if (!isWritable) {
    const err = new redisErrors.UpdateDeleteForbidden({
      explanation: `The user: ${userName}, does not have write permission` +
        ` on the sample: ${sample.name}`,
    });
    if (isBulk) {
      return Promise.reject({ isFailed: true, explanation: err });
    }

    return Promise.reject(err);
  }

  return Promise.resolve(true);
} // checkWritePermission

/**
 * Sort by appending all fields value in a string and then comparing them.
 * If first fields starts with -, sort order is descending.
 * @param  {Array} sampArr - Sample objs array
 * @param  {Array} propArr - Fields array
 * @returns {Array} - Sorted array
 */
function sortByOrder(sampArr, propArr) {
  const isDescending = propArr[ZERO].startsWith('-');
  return sampArr.sort((a, b) => {
    let strA = '';
    let strB = '';
    propArr.forEach((field) => {
      strA += a[field];
      strB += b[field];
    });

    if (strA < strB) {
      return isDescending ? ONE : MINUS_ONE;
    }

    if (strA > strB) {
      return isDescending ? MINUS_ONE : ONE;
    }

    return ZERO;
  });
}

/**
 * Get option fields from requesr parameters. An example:
 * { attributes: [ 'name', 'status', 'value', 'id' ],
    order: [ '-value', 'status' ],
    limit: 5,
    offset: 1,
    filter: { name: '___Subject1.___Subject2*' } }
 * @param  {Object} params - Request query parameters
 * @returns {Object} - Filter object
 */
function getOptionsFromReq(params) {
  // eg. ?fields=x,y,z. Adds as opts.attributes = [array of fields]
  // id is always included
  const opts = u.buildFieldList(params);

  // Specify the sort order. If defaultOrder is defined in props or sort value
  // then update sort order otherwise take value from model defination
  if ((params.sort && params.sort.value) || helper.defaultOrder) {
    opts.order = params.sort.value || helper.defaultOrder;
  }

  // handle limit
  if (params.limit && params.limit.value) {
    opts.limit = parseInt(params.limit.value, defaults.limit);
  }

  // handle offset
  if (params.offset && params.offset.value) {
    opts.offset = parseInt(params.offset.value, defaults.offset);
  }

  const filter = {};
  const keys = Object.keys(params);

  for (let i = ZERO; i < keys.length; i++) {
    const key = keys[i];
    const isFilterField = apiConstants.NOT_FILTER_FIELDS.indexOf(key) < ZERO;
    if (isFilterField && params[key].value !== undefined) {
      filter[key] = params[key].value;
    }
  }

  opts.filter = filter;
  return opts;
}

/**
 * Convert array strings to Json for sample and aspect, then attach aspect to
 * sample. Then add add api links and return complete sample object.
 * @param  {Object} sampleObj - Sample object from redis
 * @param  {Object} aspectObj - Aspect object from redis
 * @returns {Object} - Sample object with aspect attached
 */
function cleanAddAspectToSample(sampleObj, aspectObj) {
  let sampleRes = {};
  sampleRes = sampleStore.arrayStringsToJson(
    sampleObj, constants.fieldsToStringify.sample
  );
  const aspect = sampleStore.arrayStringsToJson(
    aspectObj, constants.fieldsToStringify.aspect
  );
  sampleRes.aspect = aspect;
  return sampleRes;
}

/**
 * Apply limit and offset filter to sample array
 * @param  {Object} opts - Filter options
 * @param  {Array} sampArr - Array of sample keys or objects
 * @returns {Array} - Sliced array
 */
function applyLimitAndOffset(opts, sampArr) {
  let startIndex = 0;
  let endIndex = sampArr.length;
  if (opts.offset) {
    startIndex = opts.offset;
  }

  if (opts.limit) {
    endIndex = startIndex + opts.limit;
  }

  // apply limit and offset, default 0 to length
  return sampArr.slice(startIndex, endIndex);
}

/**
 * Apply wildcard filter on sample array of keys or objects. For each entry,
 * if given property exists for sample, apply regex to the property value,
 * else if, the property is 'name', then the function was called before getting
 * obj, hence apply regex filter on sample name.
 * @param  {Array}  sampArr - Array of sample keys or sample objects
 * @param  {String}  prop  - Property name
 * @param  {String} propExpr - Wildcard expression
 * @returns {Array} - Filtered array
 */
function filterByFieldWildCardExpr(sampArr, prop, propExpr) {
  // regex to match wildcard expr, i option means case insensitive
  const escapedExp = propExpr.split('_').join('\\_')
                      .split('|').join('\\|').split('.').join('\\.');

  const re = new RegExp('^' + escapedExp.split('*').join('.*') + '$', 'i');
  return sampArr.filter((sampEntry) => {
    if (sampEntry[prop]) { // sample object
      return re.test(sampEntry[prop]);
    } else if (prop === sampFields.NAME) { // sample key
      const sampName = sampleStore.getNameFromKey(sampEntry);
      return re.test(sampName);
    }

    return false;
  });
}

/**
 * Apply filters on sample keys list
 * @param  {Array} sampKeysArr - Sample key names array
 * @param  {Object} opts - Filter options
 * @returns {Array} - Filtered sample keys array
 */
function applyFiltersOnSampKeys(sampKeysArr, opts) {
  let resArr = sampKeysArr;

  // apply limit and offset if no sort order defined
  if (!opts.order) {
    resArr = applyLimitAndOffset(opts, sampKeysArr);
  }

  // apply wildcard expr on name, if specified
  if (opts.filter && opts.filter.name) {
    const filteredKeys = filterByFieldWildCardExpr(
      resArr, sampFields.NAME, opts.filter.name
    );
    resArr = filteredKeys;
  }

  return resArr;
}

/**
 * Apply field list filter.
 * @param  {Object} sample - Sample object
 * @param  {Array} attributes - Sample fields array
 */
function applyFieldListFilter(sample, attributes) {
  // apply field list filter
  Object.keys(sample).forEach((sampField) => {
    if (!attributes.includes(sampField)) {
      delete sample[sampField];
    }
  });
}

/**
 * Apply filters on sample array list
 * @param  {Array} sampObjArray - Sample objects array
 * @param  {Object} opts - Filter options
 * @returns {Array} - Filtered sample objects array
 */
function applyFiltersOnSampObjs(sampObjArray, opts) {
  let filteredSamples = sampObjArray;

  // apply wildcard expr if other than name because
  // name filter was applied before redis call
  if (opts.filter) {
    const filterOptions = opts.filter;
    Object.keys(filterOptions).forEach((field) => {
      if (field !== sampFields.NAME) {
        const filteredKeys = filterByFieldWildCardExpr(
          sampObjArray, field, filterOptions[field]
        );
        filteredSamples = filteredKeys;
      }
    });
  }

  // sort and apply limits to samples
  if (opts.order) {
    const sortedSamples = sortByOrder(filteredSamples, opts.order);
    filteredSamples = sortedSamples;

    const slicedSampObjs = applyLimitAndOffset(opts, filteredSamples);
    filteredSamples = slicedSampObjs;
  }

  return filteredSamples;
}

/**
 * Remove extra fields from query body object.
 * @param  {Object} qbObj - Query body object
 */
function cleanQueryBodyObj(qbObj) {
  Object.keys(qbObj).forEach((qbField) => {
    if (!sampleFieldsArr.includes(qbField)) {
      delete qbObj[qbField];
    }
  });
}

/**
 * Create properties array having and fields and values need to be set to
 * update/create sample. Value is empty string if new object being created.
 * If some value, then calculate status. Update status, previous status and
 * changed at fields in 2 cases: a) sampObj not present, or b) sample obj
 * present and previous status != current status.
 * @param  {Object} qbObj - Query body object
 * @param  {Object} sampObj - Sample object
 * @param  {Object} aspectObj - Aspect object
 */
function createSampHsetCommand(qbObj, sampObj, aspectObj) {
  cleanQueryBodyObj(qbObj); // remove extra fields
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
}

/**
 * Throws custom error object based on object type for sample upsert.
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
}

/**
 * Upsert a sample. Check if subject exist. If yes, Get aspect and sample.
 * If aspect exists, create fields array with values need to be set for sample
 * in redis. Add aspect name to subject set, add aspect key to sample set and
 * update/create sample hash. We use hset which updates a sample if exists,
 * else creates a new one.
 * @param  {Object} sampleQueryBodyObj - Query Body Object for a sample
 * @param  {Boolean} isBulk - If the caller method is bulk upsert
 * @param {String} userName - The user performing the write operation
 * @returns {Object} - Updated sample
 */
function upsertOneSample(sampleQueryBodyObj, isBulk, userName) {
  const sampleName = sampleQueryBodyObj.name;
  const subjAspArr = sampleName.toLowerCase().split('|');
  if (subjAspArr.length < TWO) {
    const err = new redisErrors.ValidationError({
      explanation: 'Incorrect sample name.',
    });

    if (isBulk) {
      return Promise.reject({ isFailed: true, explanation: err });
    }

    return Promise.reject(err);
  }

  const sampleKey = sampleStore.toKey(
    constants.objectType.sample, sampleName
  );
  const absolutePath = subjAspArr[ZERO];
  const aspectName = subjAspArr[ONE];
  const subjKey = sampleStore.toKey(
    constants.objectType.subject, absolutePath
  );

  let aspectObj = {};
  let subject;
  let aspect;
  let sample;
  return checkWritePermission(aspectName, sampleName, userName, isBulk)

  /*
   * if any of the promise errors, the subsequent promise does not process and
   * error is returned, else sample is returned
   */
  .then(() => Promise.all([
    redisClient.hgetallAsync(subjKey),
    redisClient.hgetallAsync(
    sampleStore.toKey(constants.objectType.aspect, aspectName)
    ),
    redisClient.hgetallAsync(sampleKey),
  ])
  .then((responses) => {
    [subject, aspect, sample] = responses;
    if (!subject) {
      handleUpsertError(constants.objectType.subject, isBulk);
    }

    if (!aspect) {
      handleUpsertError(constants.objectType.aspect, isBulk);
    }

    sampleQueryBodyObj.subjectId = subject.id;
    sampleQueryBodyObj.aspectId = aspect.id;

    aspectObj = sampleStore.arrayStringsToJson(
      aspect, constants.fieldsToStringify.aspect
    );

    return checkWritePermission(aspectObj, sampleQueryBodyObj,
      userName, isBulk);
  })
  .then(() => {
    // sampleQueryBodyObj updated with fields
    createSampHsetCommand(sampleQueryBodyObj, sample, aspectObj);

    // if sample exists, just update sample.
    if (sample) {
      // to avoid updating sample name
      delete sampleQueryBodyObj.name;
      return redisClient.hmsetAsync(sampleKey, sampleQueryBodyObj);
    }

    // sample is new
    // make sure the name is a combination of subject
    // and aspect fields
    sampleQueryBodyObj.name = subject.absolutePath + '|' + aspectObj.name;

    const subaspMapKey = sampleStore.toKey(
      constants.objectType.subAspMap, absolutePath
    );

    // add aspect name to subject set, add sample key to sample set,
    // create/update hash of sample
    return redisClient.batch([
      ['sadd', subaspMapKey, aspectName],
      ['sadd', constants.indexKey.sample, sampleKey],
      ['hmset', sampleKey, sampleQueryBodyObj],
    ]).execAsync();
  }))
  .then(() => redisClient.hgetallAsync(sampleKey))
  .then((updatedSamp) => cleanAddAspectToSample(updatedSamp, aspectObj))
  .catch((err) => {
    if (isBulk) {
      return err;
    }

    throw err;
  });
}

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
    const subjAspArr = sampleName.toLowerCase().split('|');

    if (subjAspArr.length < TWO) {
      const err = new redisErrors.ValidationError({
        explanation: 'Incorrect sample name.',
      });
      return Promise.resolve(err);
    }

    const subjAbsPath = subjAspArr[ZERO];
    const aspName = subjAspArr[ONE];
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

      aspect = aspObj;
      return checkWritePermission(aspect, sampObjToReturn, userName);
    })
    .then(() => {

      // delete sample entry from the master list of sample index
      cmds.push(redisOps.delKeyFromIndexCmd(sampleType, sampleName));

      // delete the aspect from the subAspMap
      cmds.push(redisOps.delAspFromSubjSetCmd(subjAbsPath, aspName));

      // delete the sample hash
      cmds.push(redisOps.delHashCmd(sampleType, sampleName));

      return redisOps.executeBatchCmds(cmds);
    })
    .then(() => redisOps.executeBatchCmds(cmds))
    .then(() => {
      // attach aspect and links to sample
      const resSampAsp = cleanAddAspectToSample(sampObjToReturn, aspect);
      return resSampAsp;
    });
  },

  /**
   * Delete sample related links
   * @param  {Object} params - Request parameters
   * @param {String} userName - The user performing the write operation
   * @returns {Promise} - Resolves to a sample object
   */
  deleteSampleRelatedLinks(params, userName) {
    const sampleName = params.key.value;
    const sampAspArr = sampleName.split('|');
    if (sampAspArr.length < TWO) {
      throw new redisErrors.ResourceNotFoundError({
        explanation: 'Incorrect sample name.',
      });
    }

    const aspectName = sampAspArr[ONE];
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

      aspectObj = aspObj;
      return checkWritePermission(aspectObj, currSampObj, userName);
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
  },

  /**
   * Patch sample. First get sample, if not found, throw error, else get aspect.
   * Update request body with required fields based on value and related links
   * if needed. Update sample. Then get updated sample, attach aspect and return
   * response. Note: Message body and message code will be updated if provided,
   * else no fields for message body/message code in redis object.
   * @param  {Object} params - Request parameters
   * @param {String} userName - The user performing the write operation
   * @returns {Promise} - Resolves to a sample object
   */
  patchSample(params, userName) {
    const reqBody = params.queryBody.value;
    const sampleName = params.key.value;
    const sampAspArr = sampleName.split('|');
    if (sampAspArr.length < TWO) {
      throw new redisErrors.ResourceNotFoundError({
        explanation: 'Incorrect sample name.',
      });
    }

    const aspectName = sampAspArr[ONE];
    let currSampObj;
    let aspectObj;
    return checkWritePermission(aspectName, sampleName, userName)
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
      if (!aspObj) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Aspect not found.',
        });
      }

      cleanQueryBodyObj(reqBody);
      aspectObj = sampleStore.arrayStringsToJson(
        aspObj, constants.fieldsToStringify.aspect
      );

      return checkWritePermission(aspectObj, currSampObj, userName);
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
    .then((updatedSamp) => cleanAddAspectToSample(updatedSamp, aspectObj));
  },

  /**
   * Post sample. First get subject from db, then get aspect from db, then try
   * to get sample from Redis. Is sample found, throw error, else create
   * sample. Update sample index and subject set as well.
   * @param  {Object} params - Request parameters
   * @param {String} userName - The user performing the write operation
   * @returns {Promise} - Resolves to a sample object
   */
  postSample(params, userName) {
    const cmds = [];
    const reqBody = params.queryBody.value;
    let subject;
    let sampleName;
    let aspectObj;

    return db.Subject.findById(reqBody.subjectId)
    .then((subjFromDb) => {
      if (!subjFromDb) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Subject not found.',
        });
      }

      subject = subjFromDb;
      return db.Aspect.findById(reqBody.aspectId);
    })
    .then((aspFromDb) => {
      if (!aspFromDb || !aspFromDb.isPublished) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Aspect not found.',
        });
      }

      aspectObj = aspFromDb;
      return aspFromDb.isWritableBy(userName);
    })
    .then((isWritable) => {
      sampleName = subject.absolutePath + '|' + aspectObj.name;
      if (featureToggles.isFeatureEnabled('enforceWritePermission') &&
        !isWritable) {
        const err = new redisErrors.UpdateDeleteForbidden({
          explanation: `The user: ${userName}, does not have write permission` +
            ` on the sample: ${sampleName}`,
        });
        return Promise.reject(err);
      }

      return redisOps.getHashPromise(sampleType, sampleName);
    })
    .then((sampFromRedis) => {
      if (sampFromRedis) {
        throw new redisErrors.ForbiddenError({
          explanation: 'Sample already exists.',
        });
      }

      cleanQueryBodyObj(reqBody); // remove extra fields
      reqBody.name = sampleName; // set name

      let value = '';
      if (reqBody.value) {
        value = reqBody.value;
      }

      // value and status
      reqBody[sampFields.STATUS] = sampleUtils.computeStatus(aspectObj, value);
      reqBody[sampFields.VALUE] = value;

      if (reqBody.relatedLinks) { // related links
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
    .then((sampleObj) => sampleStore.arrayStringsToJson(
      sampleObj, constants.fieldsToStringify.sample));
  },

  /**
   * Put sample. First get sample, if not found, throw error, else get aspect.
   * Update request body with required fields based on value and related links
   * if needed. Delete message body and message code fields from hash
   * if not provided because they will be null. Then update sample.
   * @param  {Object} params - Request parameters
   * @param {String} userName - The user performing the write operation
   * @returns {Promise} - Resolves to a sample object
   */
  putSample(params, userName) {
    const reqBody = params.queryBody.value;
    const sampleName = params.key.value;
    const sampAspArr = sampleName.split('|');
    if (sampAspArr.length < TWO) {
      throw new redisErrors.ResourceNotFoundError({
        explanation: 'Incorrect sample name.',
      });
    }

    const aspectName = sampAspArr[ONE];
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

      aspectObj = sampleStore.arrayStringsToJson(
        aspObj, constants.fieldsToStringify.aspect
      );

      return checkWritePermission(aspectObj, currSampObj, userName);
    })
    .then(() => {
      cleanQueryBodyObj(reqBody);
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
    .then((updatedSamp) => cleanAddAspectToSample(updatedSamp, aspectObj));
  },

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
    const sampAspArr = sampleName.split('|');
    const commands = [];

    if (sampAspArr.length < TWO) {
      throw new redisErrors.ResourceNotFoundError({
        explanation: 'Incorrect sample name.',
      });
    }

    // push command to get sample
    commands.push([
      'hgetall',
      sampleStore.toKey(constants.objectType.sample, sampleName),
    ]);

    // push command to get aspect
    commands.push([
      'hgetall',
      sampleStore.toKey(constants.objectType.aspect, sampAspArr[ONE]),
    ]);

    return redisClient.batch(commands).execAsync()
    .then((responses) => {
      const sample = responses[ZERO];
      const aspect = responses[ONE];

      if (!sample || !aspect) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Sample/Aspect not found.',
        });
      }

      const opts = getOptionsFromReq(params);

      // apply fields list filter
      if (opts.attributes) {
        applyFieldListFilter(sample, opts.attributes);
      }

      // clean and attach aspect to sample, add api links as well
      const sampleRes = cleanAddAspectToSample(sample, aspect);
      return sampleRes;
    });
  },

  /**
   * Finds samples with filter options if provided. We get sample keys from
   * redis using default alphabetical order. Then we apply limit/offset and
   * wildcard expr on sample names. Using filtered keys we get samples and
   * corresponding aspects from redis in an array. We create samples array and
   * { sampleName: aspect object} map from response. Then, we apply wildcard
   * expr (other than name) to samples array, then we sort, then apply
   * limit/offset and finally field list filters. Then, attach aspect to sample
   * using map we created and add to response array.
   * @param  {Object} req - Request object
   * @param  {Object} res - Result object
   * @param  {Object} logObject - Log object
   * @returns {Promise} - Resolves to a list of all samples objects
   */
  findSamples(req, res, logObject) {
    const opts = getOptionsFromReq(req.swagger.params);
    const response = [];

    if (opts.limit || opts.offset) {
      res.links({
        prev: req.originalUrl,
        next: fu.getNextUrl(req.originalUrl, opts.limit, opts.offset),
      });
    }

    // get all Samples sorted lexicographically
    return redisClient.sortAsync(constants.indexKey.sample, 'alpha')
    .then((allSampKeys) => {
      const commands = [];
      const filteredSampKeys = applyFiltersOnSampKeys(allSampKeys, opts);

      // add to commands
      filteredSampKeys.forEach((sampKey) => {
        const aspectName = sampKey.split('|')[ONE];
        commands.push(['hgetall', sampKey]); // get sample
        commands.push(
          ['hgetall',
           sampleStore.toKey(constants.objectType.aspect, aspectName),
          ]);
      });

      return redisClient.batch(commands).execAsync();
    })
    .then((redisResponses) => { // samples and aspects
      logObject.dbTime = new Date() - logObject.reqStartTime; // log db time
      const samples = [];

      // Eg: { samplename: asp object}, so that we can attach aspect later
      const sampAspectMap = {};
      for (let num = 0; num < redisResponses.length; num += TWO) {
        samples.push(redisResponses[num]);
        sampAspectMap[redisResponses[num].name] = redisResponses[num + ONE];
      }

      const filteredSamples = applyFiltersOnSampObjs(samples, opts);
      filteredSamples.forEach((sample) => {

        const sampName = sample.name;
        if (opts.attributes) { // delete sample fields, hence no return obj
          applyFieldListFilter(sample, opts.attributes);
        }

        // attach aspect to sample
        const resSampAsp = cleanAddAspectToSample(
          sample, sampAspectMap[sampName]
        );

        // add api links
        resSampAsp.apiLinks = u.getApiLinks(
          resSampAsp.name, helper, req.method
        );
        response.push(resSampAsp); // add sample to response
      });

      return response;
    });
  },

  /**
   * Upsert sample in Redis.
   * @param  {Object} qbObj - Query body object
   * @param {String} userName - The user performing the write operation
   * @returns {Promise} - Resolves to upserted sample
   */
  upsertSample(qbObj, userName) {
    return upsertOneSample(qbObj, false, userName);
  },

  /**
   * Upsert multiple samples in Redis concurrently.
   * @param  {Object} sampleQueryBody - Query body object
   * @param {String} userName - The user performing the write operation
   * @param {Array} readOnlyFields - An array of read-only-fields
   * @returns {Array} - Resolves to an array of resolved promises
   */
  bulkUpsertByName(sampleQueryBody, userName, readOnlyFields) {
    const promises = sampleQueryBody.map((sampleReq) => {
      try {
        // thow an error if a sample is upserted with a read-only-field
        commonUtils.noReadOnlyFieldsInReq(sampleReq, readOnlyFields);
        return upsertOneSample(sampleReq, true, userName);
      } catch (err) {
        return Promise.resolve({ isFailed: true, explanation: err });
      }
    });

    return Promise.all(promises);
  },
};
