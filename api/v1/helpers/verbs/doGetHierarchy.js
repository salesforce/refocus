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
          return resultObj;
        });
      } else {
        resultObj.retval = helper.modifyAPIResponse(retval, params);
        return resultObj;
      }
    });
} // doGetHierarchy

module.exports = doGetHierarchy;
