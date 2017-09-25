/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/auditEventUtils.js
 *
 * Used by the AuditEvent model.
 */

'use strict'; // eslint-disable-line strict
const Joi = require('joi');
const ValidationError = require('../dbErrors').ValidationError;

const eventLogSchema = Joi.object().keys({
  // example, "trust1-collector", "avgpagetime", "Salesforce.SFDC_CORE.NA1”
  resourceName: Joi.string().required(),

  // example, "Collector", "Subject", "Aspect"
  resourceType: Joi.string().required(),
  isError: Joi.boolean().required(),
});

/**
 * Validates that eventLog confirms with eventLogSchema
 * @param  {Object} eventLog - Event log of collector audit
 * @throws {ValidationError} If eventLog does not contain valid attributes
 */
function validateEventLog(eventLog) {
  // allowUnknown option allows additional fields in eventLogSchema which
  // are ignored by joi validation
  const result = Joi.validate(eventLog, eventLogSchema, { allowUnknown: true });
  if (result.error !== null) {
    throw new ValidationError({
      message: JSON.stringify(result.error.details),
    });
  }
}

module.exports = {
  validateEventLog,
}; // exports
