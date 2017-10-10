/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/auditEvents.js
 */
'use strict'; // eslint-disable-line strict

const AuditEvent = require('../../../../db/index').AuditEvent;
const m = 'auditevent';

/**
 * Function to modify the where clause passed to the database model. The
 * startAt and endAt keys are replaced with the loggedAt key and assigned to the
 * corresponding comparision operator
 * @param  {Object} params  - Request parameters
 * @param  {Object} options - options object that will be passed to the
 * database model while querying
 * @returns {Object} options object with a modified "where" clause
 */
function modifyWhereClause(params, options) {
  if (options.where.startAt) {
    options.where.loggedAt = options.where.loggedAt || {};
    options.where.loggedAt.$gte = new Date(params.startAt.value);
    delete options.where.startAt;
  }

  if (options.where.endAt) {
    options.where.loggedAt = options.where.loggedAt || {};
    options.where.loggedAt.$lte = new Date(params.endAt.value);
    delete options.where.endAt;
  }

  return options;
} // modifyWhereClause

module.exports = {
  apiLinks: {
    POST: `Create a new ${m}`,
    GET: `Retrieve this ${m}`,
  },
  baseUrl: '/v1/AuditEvents',
  model: AuditEvent,
  modelName: 'AuditEvent',
  modifyWhereClause,
}; // exports
