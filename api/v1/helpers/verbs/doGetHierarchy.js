/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doGetHierarchy.js
 */
'use strict';

const featureToggles = require('feature-toggles');
const redisSubjectModel = require('../../../../cache/models/subject');
const sampleStoreFeature =
  require('../../../../cache/sampleStore').constants.featureName;
const helper = require('../nouns/subjects');
const u = require('./utils');
const ZERO = 0;
const GET = 'GET';

/**
 * Retrieves the subject with all its descendents included.
 *
 * @param {Object} resultObj - The result Object
 */
function doGetHierarchy(resultObj) {
  const params = resultObj.params;
  const depth = Number(params.depth.value);
  resultObj.dbStartTime = Date.now();

  const fields = params.fields.value;
  const filterFields = fields && fields.length;
  const subjectTags = params.subjectTags.value;
  const filterByTags = subjectTags && subjectTags.length;
  const excludedFields = [];

  if (filterFields) {
    //if createdBy field is excluded, need to add it for the SQL query to work
    if (!fields.includes('createdBy')) {
      excludedFields.push('createdBy');
    }

    //if absolutePath field is excluded, need to add it for the SQL query to work
    if (!fields.includes('absolutePath')) {
      excludedFields.push('absolutePath');
    }

    //if tags field is excluded, need to add it so we can filter by tags later
    if (filterByTags && !fields.includes('tags')) {
      excludedFields.push('tags');
    }

    excludedFields.forEach(f => fields.push(f));
  }

  const findByKeyPromise =
    featureToggles.isFeatureEnabled(sampleStoreFeature) ?
      u.findByKey(helper, params, ['subjectHierarchy']) :
      u.findByKey(helper, params, ['hierarchy', 'samples']);
  return findByKeyPromise
    .then((o) => {
      resultObj.dbEndTime = Date.now();
      resultObj.dbTime = resultObj.dbEndTime - resultObj.dbStartTime;
      resultObj.recordCount = 1;
      let retval = u.responsify(o, helper, GET);
      if (depth > ZERO) {
        retval = helper.deleteChildren(retval, depth);
      }

      // if samples are stored in redis, get the samples from there.
      if (featureToggles.isFeatureEnabled(sampleStoreFeature)) {
        return redisSubjectModel.completeSubjectHierarchy(retval, params)
        .then((_retval) => {
          resultObj.retval = _retval;
          excludedFields.forEach(f => delete retval[f]);
          return resultObj;
        });
      } else {
        resultObj.retval = helper.modifyAPIResponse(retval, params);
        excludedFields.forEach(f => delete retval[f]);
        return resultObj;
      }
    });
} // doGetHierarchy

module.exports = doGetHierarchy;
