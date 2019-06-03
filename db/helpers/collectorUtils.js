/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/collectorUtils.js
 *
 * Used by the Collector model.
 */

'use strict'; // eslint-disable-line strict

const Joi = require('joi');
const common = require('./common');
const dbErrors = require('../dbErrors');
const ValidationError = dbErrors.ValidationError;
const Op = require('sequelize').Op;
const semverRegex = require('semver-regex');
const utils = require('../utils.js');

const osInfoSchema = Joi.object().keys({
  arch: Joi.string(),
  hostname: Joi.string(),
  platform: Joi.string(),
  release: Joi.string(),
  type: Joi.string(),
  username: Joi.string(),
});

const processInfoSchema = Joi.object().keys({
  execPath: Joi.string(),
  memoryUsage: Joi.object().keys({
    rss: Joi.number().integer(),
    heapTotal: Joi.number().integer(),
    heapUsed: Joi.number().integer(),
    external: Joi.number().integer(),
  }),
  uptime: Joi.number(),
  version: Joi.string(),
  versions: Joi.object(),
});

/**
 * Validates that OsInfo confirms with osInfoSchema
 * @param  {Object} osInfo - OS info of collector
 * @throws {ValidationError} If osInfo does not contain valid attributes
 */
function validateOsInfo(osInfo) {
  if (osInfo === null || osInfo === undefined) {
    return;
  }

  const result = Joi.validate(osInfo, osInfoSchema);

  if (result.error !== null) {
    throw new ValidationError({
      message: JSON.stringify(result.error.details),
    });
  }
}

/**
 * Validates that processInfo confirms with processInfoSchema
 * @param  {Object} processInfo - Process info of collector
 * @throws {ValidationError} If processInfo does not contain valid attributes
 */
function validateProcessInfo(processInfo) {
  if (processInfo === null || processInfo === undefined) {
    return;
  }

  const result = Joi.validate(processInfo, processInfoSchema);
  if (result.error !== null) {
    throw new ValidationError({
      message: JSON.stringify(result.error.details),
    });
  }
}

/**
 * Validates that version is valid
 * @param  {String} version - Version of collector
 * @throws {ValidationError} If version is not valid
 */
function validateVersion(version) {
  if (!semverRegex().test(version)) {
    throw new ValidationError({
      message: 'Not a valid version.',
    });
  }
}

/**
 * Reject the request if collectorNames contain duplicate names
 * @param {Array} collectorNames Array of strings
 * @returns {Promise} empty if validation passed, reject otherwise
 */
function validateNames(collectorNames) {
  if (common.checkDuplicatesInStringArray(collectorNames)) {
    const err = new dbErrors.DuplicateCollectorError();
    err.resourceType = 'Collector';
    err.resourceKey = collectorNames;
    return Promise.reject(err);
  }

  return Promise.resolve();
}

/**
 * Find unassigned generators and assign them.
 * @returns {Promise} - Resolves to array of assigned generator db objects
 */
function assignUnassignedGenerators() {
  // finds all unassigned generators (those with no currentCollector).
  // Use collectorId because it's a field on the db model, vs currentCollector
  // which is an association and can't be looked up with a normal where clause

  const findUnassigned = { where: { isActive: true, collectorId: null } };
  return utils.seq.models.Generator.findAll(findUnassigned)
    .map((g) => g.assignToCollector().then(() => g.save()));
}

/**
 * Returns a where clause object that uses the "IN" operator
 * @param  {Array} arr - An array that needs to be assigned to the "IN" operator
 * @returns {Object} - An where clause object
 */
function whereClauseForNameInArr(arr) {
  const whr = {};
  whr.name = {};
  whr.name[Op.in] = arr;
  return whr;
} // whereClauseForNameInArr

/**
 * If collectors exist, return a Promise with an
 * Array of collector objects referenced by collectorNames.
 * If collector names are not supplied, return a Promise
 * with an empty array
 * If collector names are invalid, reject with error.

 * @param {Object} seq The sequelize object
 * @param {Array} collectorNames Array of Strings
 * @returns {Promise} with an array if check passed, error otherwise
 */
function getByNames(seq, collectorNames) {
  if (!collectorNames || !collectorNames.length) return [];

  const options = {};
  options.where = whereClauseForNameInArr(collectorNames);

  // reject the request if collectorNames contain duplicate names
  return new Promise((resolve, reject) =>
    seq.models.Collector.findAll(options)
      .then((_collectors) => {
        /*
         * If requestBody does not have a collectors field, OR
         * if the number of collectors in requestBody MATCH the
         * GET result, order the collectors AND create the generator.
         * Else throw error since there are collectors that don't exist.
         */
        if (_collectors.length === collectorNames.length) {
          resolve(_collectors);
        }

        const err = new dbErrors.ResourceNotFoundError();
        err.resourceType = 'Collector';
        err.resourceKey = collectorNames;
        reject(err);
      })
  );
}

/**
 * Used by db model.
 * Validate the collectors field: if succeed, return a promise with
 * the collectors.
 * If fail, reject Promise with the appropriate error
 *
 * @param {Object} seq the Sequelize object
 * @param {Array} collectorNames Array of strings
 * @returns {Promise} with collectors if validation and check pass,
 * rejected promise with the appropriate error otherwise.
 */
function validate(seq, collectorNames) {
  if (!collectorNames || !collectorNames.length) return Promise.resolve([]);
  return new seq.Promise((resolve, reject) =>
    validateNames(collectorNames)
      .then(() => getByNames(seq, collectorNames))
      .then(resolve)
      .catch(reject)
  );
}

/**
 * Checks if any of the collectors in the array is already assigned to a group.
 * @param {Array<Object>} arr - array of collector objects
 * @returns {Array<Object>} the original array
 */
function alreadyAssigned(arr) {
  const toReject = arr.filter((collector) => collector.collectorGroup);
  if (toReject.length === 0) {
    return arr;
  }

  const names = toReject.map((c) => c.name);
  const msg = `Cannot double-assign collector(s) [${names.join(', ')}] to ` +
    'collector groups';
  throw new ValidationError(msg);
} // alreadyAssigned

/**
 * Checks if any of the collectors in the array is already assigned to a group
 * other than the one specified
 * @param {Array<Object>} arr - array of collector objects
 * @param {CollectorGroup} group - collector group
 * @returns {Array<Object>} the original array
 */
function alreadyAssignedToOtherGroup(arr, group) {
  const toReject = arr.filter((collector) =>
    collector.collectorGroup && collector.collectorGroup.id !== group.id
  );
  if (toReject.length === 0) {
    return arr;
  }

  const names = toReject.map((c) => c.name);
  const msg = `Cannot double-assign collector(s) [${names.join(', ')}] to ` +
    'collector groups';
  throw new ValidationError(msg);
} // alreadyAssignedToOtherGroup

module.exports = {
  alreadyAssigned,
  alreadyAssignedToOtherGroup,
  validateOsInfo,
  validateProcessInfo,
  validateVersion,
  assignUnassignedGenerators,
  validate,
}; // exports
