/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/collectorGroups.js
 */
'use strict'; // eslint-disable-line strict
const doPost = require('../helpers/verbs/doPost');
const helper = require('../helpers/nouns/collectorGroups');

/**
 * POST /collectorGroups
 *
 * Creates a new collector group and sends it back in the response.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function createCollectorGroups(req, res, next) {
  doPost(req, res, next, helper);
}

module.exports = {
  createCollectorGroups,
};
