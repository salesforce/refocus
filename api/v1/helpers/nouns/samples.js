/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/samples.js
 */
'use strict';

const Sample = require('../../../../db/index').Sample;
const Aspect = require('../../../../db/index').Aspect;
const Subject = require('../../../../db/index').Subject;

const m = 'sample';
const fieldsWithJsonArrayType = ['relatedLinks'];

// exclude fields of the response at the API level
const fieldsToExclude = ['id'];
const fieldsWithEnum = ['status', 'previousStatus'];

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/samples',
  model: Sample,
  modelName: 'Sample',
  fieldsWithJsonArrayType,
  fieldsWithEnum,
  fieldsToExclude,
  publishEvents: true,
  associatedModels: {
    aspect: Aspect,
    subject: Subject,
  },

}; // exports
