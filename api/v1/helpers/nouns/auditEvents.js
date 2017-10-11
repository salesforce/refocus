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
const timeUnits = new Set(['d', 'h', 'm', 's']);
const SIXTY_SECONDS = 60;
const TWENTYFOUR_HOURS = 24;
const timeUnitsInMS = {
  s: 1000,
  m: SIXTY_SECONDS * 1000,
  h: SIXTY_SECONDS * SIXTY_SECONDS * 1000,
  d: TWENTYFOUR_HOURS * SIXTY_SECONDS * SIXTY_SECONDS * 1000,
};

const ONE = 1;
const TWO = 2;

/**
 * This takes a date time offset like -15d or -100h or -10s and converts
 * it to the actual date time value relative to the current date. The offset
 * is substracted from the current date by converting it to milli seconds and
 * a new date object created and returned.
 * @param  {String} offset - A date time offset suffixed by a time unit
 * @returns {Object} Date object with the offset applied
 */
function getDateTimeFromOffSet(offset) {
  // parses d out of -15d
  const timeUnit = offset[offset.length - ONE];

  // parses 15 out of -15d
  const time = offset.substr(ONE, offset.length - TWO);

  // converts 15 days to ms and substracts it from the current date
  const dateTime = Date.now() - time * timeUnitsInMS[timeUnit];
  return new Date(dateTime);
} // getDateTimeFromRelativeTime

/**
 * Function to modify the where clause passed to the database model. The
 * startAt and endAt keys are replaced with the loggedAt key and assigned to the
 * corresponding comparison operator
 * @param  {Object} params  - The request params
 * @param  {Object} options - The options object that will be passed to the
 * Sequelize find function
 * @returns {Object} options object with the "where" clause modified
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

  if (options.where.relativeDateTime) {
    options.where.loggedAt = options.where.loggedAt || {};
    const relativeDateTime = params.relativeDateTime.value;
    options.where.loggedAt.$gte = getDateTimeFromOffSet(relativeDateTime);
    delete options.where.relativeDateTime;
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
  timeUnits,
}; // exports
