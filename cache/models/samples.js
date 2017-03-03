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
  IS_DELETED: 'isDeleted',
};
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const MINUS_ONE = -1;

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
 * @param  {String} method - Request method
 * @returns {Object} - Sample object with aspect attached
 */
function cleanAddAspectToSample(sampleObj, aspectObj, method) {
  let sampleRes = {};
  sampleRes = sampleStore.arrayStringsToJson(
    sampleObj, constants.fieldsToStringify.sample
  );

  const aspect = sampleStore.arrayStringsToJson(
    aspectObj, constants.fieldsToStringify.aspect
  );

  sampleRes.aspect = aspect;

  // add api links
  sampleRes.apiLinks = u.getApiLinks(
    sampleRes.name, helper, method
  );

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
 * Create properties array having and fields and values need to be set to
 * update/create sample.
 * @param  {Object} qbObj - Query body object
 * @param  {Object} sampObj - Sample object
 * @param  {Object} aspectObj - Aspect object
 * @return {Array} Properties array need to be set
 */
function createSampHsetCommand(qbObj, sampObj, aspectObj) {
  const props = [];
  if (qbObj[sampFields.MSG_BODY]) {
    props.push(sampFields.MSG_BODY, qbObj[sampFields.MSG_BODY]);
  }

  if (qbObj[sampFields.MSG_CODE]) {
    props.push(sampFields.MSG_CODE, qbObj[sampFields.MSG_CODE]);
  }

  if (qbObj[sampFields.NAME]) {
    props.push(sampFields.NAME, qbObj[sampFields.NAME]);
  }

  /* calculate status value, update status, previous status and changed at
  fields in 2 cases: a) sampObj not present b) sample obj present and
   previous status != current status. Always update status. */
  let value;
  if (qbObj[sampFields.VALUE]) {
    value = qbObj[sampFields.VALUE];
  } else if (!sampObj) {
    value = '';
  }

  if (value) {
    const status = sampleUtils.computeStatus(aspectObj, value);

    if (!sampObj || (sampObj && (sampObj[sampFields.PRVS_STATUS] !== status))) {
      const prevStatus = sampObj ? sampObj[sampFields.STATUS] :
                            dbConstants.statuses.Invalid;
      props.push(sampFields.PRVS_STATUS, prevStatus);
      props.push(sampFields.STS_CHNGED_AT, new Date().toString());
      props.push(sampFields.STATUS, status);
    }
  }

  props.push(sampFields.UPD_AT, new Date().toString());
  props.push(sampFields.VALUE, value);

  // only in upsert, not bulk upsert,
  let rlinks = [];
  if (qbObj[sampFields.RLINKS]) {
    rlinks = qbObj[sampFields.RLINKS];
  } else {
    rlinks = [];
  }

  props.push(sampFields.RLINKS, JSON.stringify(rlinks));
  if (!sampObj) {
    props.push(sampFields.CREATED_AT, new Date().toString());
    props.push(sampFields.IS_DELETED, '0');

    // swagger ensures that bulk upsert have names
    props.push(sampFields.NAME, qbObj[sampFields.NAME]);
  }

  return props;
}

/**
 * Upsert a sample. Check if subject exist. If yes, Get aspect and sample.
 * If aspect exists, create fields array with values need to be set for sample
 * in redis. Add aspect name to subject set, add aspect key to sample set and
 * update/create sample hash. We use hset which updates a sample if exists,
 * else creates a new one.
 * @param  {Object} sampleQueryBodyObj - Query Body Object for a sample
 * @returns {Array} - Array of redis commands responses
 */
function upsertOneSample(sampleQueryBodyObj) {
  const sampleName = sampleQueryBodyObj.name;
  const subjAspArr = sampleName.toLowerCase().split('|');
  if (subjAspArr.length < TWO) {
    throw new redisErrors.ResourceNotFoundError({
      explanation: 'Incorrect sample name.',
    });
  }

  const subjKey = sampleStore.toKey(
    constants.objectType.subject, subjAspArr[ZERO]
  );
  const sampleKey = sampleStore.toKey(
    constants.objectType.sample, sampleName
  );
  const aspectName = subjAspArr[ONE];
  const commands = [];
  commands.push(['sismember', constants.indexKey.subject, subjKey]);
  commands.push([
    'hgetall',
    sampleStore.toKey(constants.objectType.aspect, aspectName),
  ]);
  commands.push([
    'hgetall',
    sampleStore.toKey(constants.objectType.sample, sampleName),
  ]);

  return redisClient.batch(commands).execAsync()
  .then((responses) => {
    const isSubjPresent = responses[ZERO];
    if (!isSubjPresent) {
      throw new redisErrors.ResourceNotFoundError({
        explanation: 'Subject not found.',
      });
    }

    if (!responses[ONE]) {
      throw new redisErrors.ResourceNotFoundError({
        explanation: 'Aspect not found.',
      });
    }

    const aspectObj = sampleStore.arrayStringsToJson(
      responses[ONE], constants.fieldsToStringify.aspect
    );
    const redisSamp = responses[TWO];
    const props = createSampHsetCommand(
      sampleQueryBodyObj, redisSamp, aspectObj
    );

    // add aspect name to subject set, add sample key to sample set,
    // create/update hash of sample
    return redisClient.batch([
      ['sadd', subjKey, aspectName],
      ['sadd', constants.indexKey.sample, sampleKey],
      ['hmset', sampleKey, props],
    ]).execAsync();
  });
}

module.exports = {

  /**
   * Retrieves the sample from redis and sends it back in the response. Get
   * sample and corresponsing aspect from redis and then apply field list
   * filter is needed. Then attach aspect to sample and return.
   *
   * @param  {string} sampleName - Sample name
   * @param  {Object} logObject - Log object
   * @param  {String} method - Type of request method
   * @param  {String} params - Req Query parameters
   * @returns {Promise} - Resolves to a sample object
   */
  getSampleFromRedis(sampleName, logObject, method, params) {
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
      logObject.dbTime = new Date() - logObject.reqStartTime; // log db time
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
      const sampleRes = cleanAddAspectToSample(sample, aspect, method);
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
   *
   * @param  {Object} logObject - Log object
   * @param  {String} method - Type of request method
   * @param  {String} params - Req Query parameters
   * @returns {Promise} - Resolves to a list of all samples objects
   */
  findSamplesFromRedis(logObject, method, params) {
    const opts = getOptionsFromReq(params);
    const commands = [];
    const response = [];

    // get all Samples sorted lexicographically
    return redisClient.sortAsync(constants.indexKey.sample, 'alpha')
    .then((allSampKeys) => {
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
          sample, sampAspectMap[sampName], method
        );
        response.push(resSampAsp); // add sample to response
      });

      return response;
    });
  },

  /**
   * Upsert sample in Redis.
   * @param  {Object} qbObj - Query body object
   * @param  {Object} logObject - Log object
   * @param  {String} method - Type of request method
   * @returns {Promise} - Resolves to upserted sample
   */
  upsertSampleInRedis(qbObj, logObject, method) {
    const sampleName = qbObj.name;
    let aspectObj;
    return upsertOneSample(qbObj)
    .then(() => {
      const aspectName = sampleName.toLowerCase().split('|')[ONE];
      return redisClient.hgetallAsync(
        sampleStore.toKey(constants.objectType.aspect, aspectName)
      );
    })
    .then((asp) => {
      aspectObj = sampleStore.arrayStringsToJson(
        asp, constants.fieldsToStringify.aspect
      );
      return redisClient.hgetallAsync(
        sampleStore.toKey(constants.objectType.sample, sampleName)
      );
    })
    .then((updatedSamp) => {
      // attach aspect to sample
      const resSampAsp = cleanAddAspectToSample(updatedSamp, aspectObj, method);
      return resSampAsp;
    });
  },

  /**
   * Upsert multiple samples in Redis.
   * @param  {Object} sampleQueryBody - Query body object
   * @returns {Array} - Resolves to an array of resolved promises
   */
  bulkUpsertSampleInRedis(sampleQueryBody) {
    const promises = sampleQueryBody.map(
      (sampleReq) => upsertOneSample(sampleReq)
    );

    return Promise.all(promises);
  },
};
