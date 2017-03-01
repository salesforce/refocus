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

const sampleStore = require('../sampleStore');
const constants = sampleStore.constants;
const redisClient = require('../redisCache').client.sampleStore;
const u = require('../../utils/filters');
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
 * Get the aspect information from the redis and attach it to the sample object
 * @param  {String} aspectName - Aspect name
 * @returns {Promise} - which resolves to an aspect object
 */
function getAspectFromRedis(aspectName) {
  const aspectKey = sampleStore.toKey(constants.objectType.aspect,
                              aspectName);
  return redisClient.hgetallAsync(aspectKey)
    .then((aspect) => {
      const fieldsToStringify = constants.fieldsToStringify.aspect;
      if (aspect) {
        fieldsToStringify.forEach((field) => {
          if (aspect[field] && !Array.isArray(aspect[field])) {
            aspect[field] = JSON.parse(aspect[field]);
          }
        });
      }

      return aspect;
    });
} // getAspectFromRedis

/**
 * Get the sample information from Redis
 * @param  {String} sampleName - Sample name
 * @returns {Promise} - which resolves to a sample object
 */
function getSampleFromRedis(sampleName) {
  const sampleKey = sampleStore.toKey(constants.objectType.sample,
                              sampleName);
  return redisClient.hgetallAsync(sampleKey)
    .then((samp) => {
      const fieldsToStringify = constants.fieldsToStringify.sample;
      if (samp) {
        fieldsToStringify.forEach((field) => {
          if (samp[field] && !Array.isArray(samp[field])) {
            samp[field] = JSON.parse(samp[field]);
          }
        });
      }

      return samp;
    });
} // getSampleFromReids

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

  const subjectKey = sampleStore.toKey(constants.objectType.subject,
                              res.absolutePath);
  return redisClient.smembersAsync(subjectKey).then((aspectNames) => {
    // console.log(1);
    const sampleAspectPromise = [];
    aspectNames.forEach((aspect) => {
      const sampleName = res.absolutePath + '|' + aspect;
      sampleAspectPromise.push(getSampleFromRedis(sampleName));
      sampleAspectPromise.push(getAspectFromRedis(aspect));
    });

    return Promise.all(sampleAspectPromise);
  }).then((saArray) => {
    for (let i = 0; i < saArray.length; i += TWO) {
      const sample = saArray[i];
      const asp = saArray[i + ONE];
      if (sample && asp) {
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
  }).then((ret) => Promise.resolve(ret || filteredChildrenArr.length));
} // traverseHierarchy

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

module.exports = {
  completeSubjectHierarchy,
}; // exports
