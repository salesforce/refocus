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

const Joi = require('joi');
const constants = require('../constants');
const ValidationError = require('../dbErrors').ValidationError;
const parameterTypes = ['BOOLEAN', 'INTEGER', 'DECIMAL', 'STRING'];
const dataTypes = ['BOOLEAN', 'INTEGER', 'DECIMAL', 'STRING', 'ARRAY'];
const dataArraySchema = Joi.array().items(
  Joi.object().keys({
    name: Joi.string().regex(/^[0-9a-z_-]+$/i).required(),
    type: Joi.string().valid(dataTypes).required(),
  })
);

const parameterArraySchema = Joi.alternatives().try(
  Joi.array().items(
    Joi.object().keys({
      name: Joi.string().regex(/^[0-9a-z_-]+$/i).required(),
      type: Joi.string().valid(parameterTypes).required(),
    })
  ),
  Joi.array().items(
    Joi.object().keys({
      name: Joi.string().regex(/^[0-9a-z_-]+$/i).required(),
      value: Joi.any().required(),
    })
  )
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
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      if ((arr[i].hasOwnProperty('key')) &&
        (arr[i].hasOwnProperty('helpText'))) {
        if (!constants.nameRegex.test(arr[i].key)) {
          throw new ValidationError({
            message: 'Missing a valid key',
          });
        }
      } else {
        throw new ValidationError({
          message: 'Missing a key or help text attribute',
        });
      }
    }
  } else {
    throw new ValidationError({
      message: 'Objects not contained in an array',
    });
  }
} // validateSettings

module.exports = {
  arrayHasValidParameters,
  validateActionArray,
  validateDataArray,
  validateSettingsArray,
}; // exports
