/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/admin/utils.js
 */
'use strict';
const tu = require('../../../testUtils');

const testStartTime = new Date();

module.exports = {
  forceDelete: () => tu.forceDelete(tu.db.Sample, testStartTime)
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => tu.forceDelete(tu.db.User, testStartTime)),
};
