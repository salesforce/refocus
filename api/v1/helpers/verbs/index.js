/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/index.js
 *
 * Exports all verbs from the verbs directory
 */

const doDelete = require('./doDelete');
const doFind = require('./doFind');
const doGet = require('./doGet');
const doPatch = require('./doPatch');
const doPost = require('./doPost');
const doPut = require('./doPut');

module.exports = {
  doDelete,
  doFind,
  doGet,
  doPatch,
  doPost,
  doPut,
};
