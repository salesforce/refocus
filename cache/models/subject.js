/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * cache/model/subject.js
 */
'use strict'; // eslint-disable-line strict

const helper = require('../../api/v1/helpers/nouns/subjects');
const fu = require('../../api/v1/helpers/verbs/findUtils.js');
const utils = require('../../api/v1/helpers/verbs/utils');
const sampleStore = require('../sampleStore');
const constants = sampleStore.constants;
const redisClient = require('../redisCache').client.sampleStore;
const u = require('../../utils/filters');
const modelUtils = require('./utils');
const redisErrors = require('../redisErrors');
const ONE = 1;
const TWO = 2;

// using the bluebird promise implementation instead of the native promise
const Promise = require('bluebird');

/*
 * All the query params that can be expected in the hierarchy endpoint are
 * defined as a key. The values of the query parameters are later added to them
 * by the set filters function
 */
const filters = {
  aspect: {},
  subjectTags: {},
  aspectTags: {},
  status: {},
};

/**
 * Given absolutePath, return whether the subject is in cache
 *
 * @param {String} absolutePath
 * @returns {Promise} resolves to true for found, false for not
 */
function subjectInSampleStore(absolutePath) {
  const subjectKey = sampleStore.toKey('subject', absolutePath);

  // get from cache
  return redisClient.sismemberAsync(
    sampleStore.constants.indexKey.subject, subjectKey);
}

/**
 * Given a subject with its samples, aspect, aspectTags and sampleStatus filters
 * are applied to the samples and the filtered samples are attached back to the
 * subject
 * @param  {Object} subj - Subject object on which the filters are applied
 * @returns {Object} - filtered subject
 */
function filterSamples(subj) {
  const filteredSamples = [];
  for (let i = 0; i < subj.samples.length; i++) {
    if (subj.samples[i].aspect) {
      if (u.applyFilters(subj.samples[i].aspect.name, 'aspect', filters) &&
        u.applyTagFilters(subj.samples[i].aspect.tags, 'aspectTags', filters) &&
        u.applyFilters(subj.samples[i].status, 'status', filters)) {
        filteredSamples.push(subj.samples[i]);
      }
    }
  }

  subj.samples = filteredSamples;
  return subj;
} // filterSamples

/**
 * For every subject object passed to this function, it attaches the
 * corresponding samples, if any, from Redis, while also applying the filters
 * to it.
 *
 * @param {Object} res - Subject object
 * @returns {Promise} - when resolved, the subject node has samples attached
 * to it and filter applied. The resolved value indicates if the subject node
 * has passed the filters or not. 0, indicates the subject has not passed the
 * filter criteria and any value greater than 0 indicates that the subject has
 * passed the filter criteria
 */
function attachSamples(res) {
  res.samples = [];
  const filterOnSubject = u.applyTagFilters(res.tags, 'subjectTags', filters);
  if (!filterOnSubject) {
    return Promise.resolve(filterOnSubject);
  }

  const subjectKey = sampleStore.toKey(constants.objectType.subAspMap,
                              res.absolutePath);
  return redisClient.smembersAsync(subjectKey).then((aspectNames) => {
    const cmds = [];
    aspectNames.forEach((aspect) => {
      const sampleKey = sampleStore.toKey(constants.objectType.sample,
               res.absolutePath + '|' + aspect);
      const aspectKey = sampleStore.toKey(constants.objectType.aspect, aspect);
      cmds.push(['hgetall', sampleKey]);
      cmds.push(['hgetall', aspectKey]);
    });

    return redisClient.batch(cmds).execAsync();
  }).then((saArray) => {
    for (let i = 0; i < saArray.length; i += TWO) {
      const sample = saArray[i];
      const asp = saArray[i + ONE];
      if (sample && asp) {

        // parse the array fields to JSON before adding them to the sample list
        sampleStore.arrayObjsStringsToJson(sample,
                                    constants.fieldsToStringify.sample);
        sampleStore.arrayObjsStringsToJson(asp, constants.fieldsToStringify.aspect);

        sample.aspect = asp;
        res.samples.push(sample);
      }
    }

    // apply aspect, aspectTag and sampleStatus filters to the samples
    filterSamples(res);

    /* filterOnSubject: returns true(integer > 0) only if the subjecttags are
     *   not set or if the subjecttags are set and the subject node passes the
     *   subjecttags filter condition
     * res.samples.length: returns true (length > 0) only if filterOnSubject is
     *   true and the samples have passed the aspect, aspectTags and the sample
     *   status filter condition.
     * filters.aspect.includes/filters.aspectTags.includes/filters.status
     *    .includes: are each true only if they are not set. Check on this is
     *    done so that we can return subjects without samples too.
     */
    const isFiltered = (filterOnSubject &&
      (res.samples.length || (!filters.aspect.includes &&
    !filters.aspectTags.includes && !filters.status.includes)));

    return Promise.resolve(isFiltered);
  }).catch((err) => {
    throw err;
  });
} // attachSamples

/**
 * This recursive function does a bottom up traversal of the hierarchy tree,
 * while calling the attachSamples function to attach samples to each node in
 * the hierarchy.
 * @param {Object} res - The subject hierarchy
 * @returns {Promise} - when resolved, the subject node (on which this function
 * is called) has the samples attached to it.
 */
function traverseHierarchy(res) {
  const traveHPromises = [];
  const filteredChildrenArr = [];
  if (res.children) {
    for (let i = 0; i < res.children.length; i++) {
      traveHPromises.push(traverseHierarchy(res.children[i]));
    }
  }

  return Promise.all(traveHPromises)
  .then((values) => {
    /*
     * the resolved values from each of the promises is used to check if that
     * node needs to be added to the final list of children
     */
    for (let i = 0; i < values.length; i++) {
      if (values[i]) {
        filteredChildrenArr.push(res.children[i]);
      }
    }

    res.children = filteredChildrenArr;
    return attachSamples(res);
  })
  .then((ret) => Promise.resolve(ret || filteredChildrenArr.length));
} // traverseHierarchy

/**
 * Given a string, get the substring after the last period.
 *
 * @param {String} absolutePath: Subject absolutePath.
 * @returns {String} name The subject name.
 */
function getNameFromAbsolutePath(absolutePath) {
  return absolutePath.split('.').pop();
}

/**
 *  When passed a partial subject hierarchy without samples, the subject
 *  hierarchy is completed by attaching samples to it.
 *
 * @param {ServerResponse} res - The subject response containing the samples
 *  and children as an array
 * @param {Object} params - The query parameters in the request along with its
 *  values
 * @returns {Promise} - when resolved, the resolved value will have the
 * complete subject hierarchy with samples
 */
function completeSubjectHierarchy(res, params) {
  // set the filters
  u.setFilters(params, filters);
  return traverseHierarchy(res)
  .then(() => {
    // once the filtering is done, reset it back.
    u.resetFilters(filters);
    return Promise.resolve(res);
  });
} // completeSubjectHierarchy

/**
 * Turns fields numeric fields turned into ints.
 *
 * Also adds a parentAbsolutePath field, if it was not there previously.
 * @param {Object} subject
 * @returns {Object} Object with parentAbsolutePath field and numeric fields.
 */
function convertStringsToNumbersAndAddParentAbsolutePath(subject) {
  // add parentAbsolutePath
  if (subject.parentAbsolutePath === undefined) {
    subject.parentAbsolutePath = '';
  }

  // convert the strings into numbers
  subject.childCount = parseInt(subject.childCount, 10) || 0;
  subject.hierarchyLevel = parseInt(subject.hierarchyLevel, 10);
  return subject;
}

module.exports = {
  completeSubjectHierarchy,

  subjectInSampleStore,

  /**
   * Returns subject with filter options if provided.
   * @param  {Object} req - Request object
   * @param  {Object} res - Result object
   * @param  {Object} logObject - Log object
   * @returns {Promise} - Resolves to a subject objects
   */
  getSubject(req, res, logObject) {
    const opts = modelUtils.getOptionsFromReq(req.swagger.params, helper);
    const key = sampleStore.toKey(constants.objectType.subject, opts.filter.key);
    return redisClient.hgetallAsync(key)
    .then((subject) => {
      if (!subject) {
        throw new redisErrors.ResourceNotFoundError({
          explanation: 'Subject not found.',
        });
      }

      subject = convertStringsToNumbersAndAddParentAbsolutePath(subject);

      logObject.dbTime = new Date() - logObject.reqStartTime; // log db time

      // convert the time fields to appropriate format
      subject.createdAt = new Date(subject.createdAt).toISOString();
      subject.updatedAt = new Date(subject.updatedAt).toISOString();

      if (opts.attributes) { // delete subject fields
        modelUtils.applyFieldListFilter(subject, opts.attributes);
      }

      // add api links
      subject.apiLinks = utils.getApiLinks(
        subject.name, helper, req.method
      );

      const result = sampleStore.arrayObjsStringsToJson(
        subject, constants.fieldsToStringify.subject
      );

      return result;
    });
  },

  /**
   * Finds subjects with filter options if provided. We get subject keys from
   * redis using default alphabetical order. Then we apply limit/offset and
   * wildcard expr on subject names. Using filtered keys we get subjects
   * from redis in an array. Then, we apply wildcard
   * expr (other than name) to subjects array, then we sort, then apply
   * limit/offset and finally field list filters.
   * @param  {Object} req - Request object
   * @param  {Object} res - Result object
   * @param  {Object} logObject - Log object
   * @returns {Promise} - Resolves to a list of all subjects objects
   */
  findSubjects(req, res, logObject) {
    const opts = modelUtils.getOptionsFromReq(req.swagger.params, helper);
    const response = [];

    res.links({
      prev: req.originalUrl,
      next: fu.getNextUrl(req.originalUrl, opts.limit, opts.offset),
    });

    // get all Subjects sorted lexicographically
    return redisClient.sortAsync(constants.indexKey.subject, 'alpha')
    .then((allSubjectKeys) => {
      const commands = [];
      const filteredSubjectKeys = modelUtils
        .prefilterKeys(allSubjectKeys, opts, getNameFromAbsolutePath);
      filteredSubjectKeys.forEach((subjectKey) => {
        commands.push(['hgetall', subjectKey]);
      });
      return redisClient.batch(commands).execAsync();
    })
    .then((subjects) => {
      logObject.dbTime = new Date() - logObject.reqStartTime; // log db time
      const filteredSubjects = modelUtils.applyFiltersOnResourceObjs(subjects, opts);
      filteredSubjects.forEach((subject) => {
        subject = convertStringsToNumbersAndAddParentAbsolutePath(subject);

        // convert the time fields to appropriate format
        subject.createdAt = new Date(subject.createdAt).toISOString();
        subject.updatedAt = new Date(subject.updatedAt).toISOString();

        if (opts.attributes) { // delete subject fields, hence no return obj
          modelUtils.applyFieldListFilter(subject, opts.attributes);
        }

        // add api links
        subject.apiLinks = utils.getApiLinks(
          subject.name, helper, req.method
        );
        response.push(subject); // add subject to response
      });

      return response;
    });
  },
}; // exports
