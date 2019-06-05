/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/botUtils.js
 *
 * Used by the Bot model.
 */
'use strict'; // eslint-disable-line strict

const Joi = require('joi');
const ValidationError = require('../dbErrors').ValidationError;
const parameterTypes = ['BOOLEAN', 'INTEGER', 'DECIMAL', 'STRING', 'ARRAY'];
const dataTypes = ['BOOLEAN', 'INTEGER', 'DECIMAL', 'STRING', 'ARRAY'];
const dataArraySchema = Joi.array().items(
  Joi.object().keys({
    name: Joi.string().regex(/^[0-9a-z_-]+$/i).required(),
    type: Joi.string().valid(dataTypes).insensitive().required(),
  })
);

const parameterArraySchema = Joi.alternatives().try(
  Joi.array().items(
    Joi.object().keys({
      name: Joi.string().regex(/^[0-9a-z_-]+$/i).required(),
      type: Joi.string().valid(parameterTypes).insensitive().required(),
    })
  ),
  Joi.array().items(
    Joi.object().keys({
      name: Joi.string().regex(/^[0-9a-z_-]+$/i).required(),
      value: Joi.any().required(),
    })
  )
);

const settingsArraySchema = Joi.array().items(
    Joi.object().keys({
      key: Joi.string().regex(/^[0-9a-z_-]+$/i).max(254).required(),
      helpText: Joi.string().regex(/^\w+(\s\w+)*$/i).required(),
    })
  );

const actionArraySchema = Joi.array().items(
  Joi.object().keys({
    name: Joi.string().regex(/^[0-9a-z_-]+$/i).required(),
    parameters: parameterArraySchema,
  })
);

/**
 * Confirms that the array elements contains name and type attributes
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} - if the array does not contain valid attributes
 */
function arrayHasValidParameters(arr) {
  if (arr === null || arr === undefined) {
    return;
  }

  const result = Joi.validate(arr, parameterArraySchema);

  if (result.error !== null) {
    throw new ValidationError({
      message: result.error.details,
    });
  }
} // arrayHasValidParameters

/**
 * Custom validation rule that checks whether the the actions values have names
 * and that the parameters listed at valid parameter types
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} - Invalid actions array
 */
function validateActionArray(arr) {
  if (arr === null || arr === undefined) {
    return;
  }

  const result = Joi.validate(arr, actionArraySchema);

  if (result.error !== null) {
    throw new ValidationError({
      message: result.error.details,
    });
  }
} // validateActionArray

/**
 * Custom validation rule that checks whether the data values have names
 * and valid data types
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} - Invalid data array
 */
function validateDataArray(arr) {
  if (arr === null || arr === undefined) {
    return;
  }

  const result = Joi.validate(arr, dataArraySchema);

  if (result.error !== null) {
    throw new ValidationError({
      message: result.error.details,
    });
  }
} // validateDataArray

/**
 * Custom validation rule that checks the settings array to have
 * all valid entries. Meaning each element contains key and a value.
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} - Invalid settings array
 */
function validateSettingsArray(arr) {
  if (arr === null || arr === undefined) {
    return;
  }

  const result = Joi.validate(arr, settingsArraySchema);

  if (result.error !== null) {
    throw new ValidationError({
      message: result.error.details,
    });
  }
} // validateSettings

module.exports = {
  arrayHasValidParameters,
  validateActionArray,
  validateDataArray,
  validateSettingsArray,
}; // exports
