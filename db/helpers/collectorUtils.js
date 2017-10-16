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
const ValidationError = require('../dbErrors').ValidationError;
const semverRegex = require('semver-regex');

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

module.exports = {
  validateOsInfo,
  validateProcessInfo,
  validateVersion,
}; // exports
