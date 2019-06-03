/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/roomTypeUtils.js
 *
 * Used by the RoomType model.
 */
'use strict'; // eslint-disable-line strict

const dbErrors = require('../dbErrors');
const ValidationError = require('../dbErrors').ValidationError;
const constants = require('../constants');
const MAX_ARGUMENTS = 2;
const Op = require('sequelize').Op;

/**
 * Determines actions parameters contain a name and value
 *
 * @param {String} arr - list of parameters
 * @returns {undefined} - OK
 * @throws {validationError} - Missing attribute
 */
function validateActionsParameters(arr) {
  for (let j = 0; j < arr.length; j++) {
    if ((arr[j].hasOwnProperty('name') !== true) ||
      (arr[j].hasOwnProperty('value') !== true)) {
      throw new ValidationError({
        message: 'Missing a name or value attribute',
      });
    }
  }
} // validateActionsParameters

/**
 * Determines if the action has a name and valid parameters
 *
 * @param {Object} obj - action object
 * @returns {undefined} - OK
 * @throws {validationError} - Missing attribute
 */
function validateActions(obj) {
  if ((obj.hasOwnProperty('name')) &&
    (obj.hasOwnProperty('parameters'))) {
    if (!constants.nameRegex.test(obj.name)) {
      throw new ValidationError({
        message: 'Missing a valid name',
      });
    }

    validateActionsParameters(obj.parameters);
  } else {
    throw new ValidationError({
      message: 'Object missing a name or parameters attribute',
    });
  }
} // validateActions

/**
 * Confirms that rule adheres to the JSON Logic Structure
 * described here http://jsonlogic.com/
 *
 * @param {Object} obj - Rule
 * @returns {undefined} - OK
 * @throws {validationError} - Incorrect JSON logic structure
 */
function validateRules(obj) {
  let j = 0;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    if ((keys[i] === 'and') || (keys[i] === 'or')) {
      while (j < obj[keys[i]].length) {
        if (validateRules(obj[keys[i]][j])) {
          j++;
        }
      }
    } else if ((Array.isArray(obj[keys[i]]) !== true) ||
      (obj[keys[i]].length !== MAX_ARGUMENTS)) {
      throw new ValidationError({
        message: 'Invalid JSON Logic Expression',
      });
    }
  }

  return true;
} // validateRules

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
        (arr[i].hasOwnProperty('value'))) {
        if (!constants.nameRegex.test(arr[i].key)) {
          throw new ValidationError({
            message: 'Missing a valid key',
          });
        }
      } else {
        throw new ValidationError({
          message: 'Missing a key or value attribute',
        });
      }
    }
  } else {
    throw new ValidationError({
      message: 'Objects not contained in an array',
    });
  }
} // validateSettings

/**
 * All rules need to have a rule and an action. Each rule
 * and will be validated by other methods after they are
 * found to exist.
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} - Invalid data array
 */
function validateRulesArray(arr) {
  if (arr === null || arr === undefined) {
    return;
  }

  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      if ((arr[i].hasOwnProperty('rule')) &&
        (arr[i].hasOwnProperty('action'))) {
        validateRules(arr[i].rule);
        validateActions(arr[i].action);
      } else {
        throw new ValidationError({
          message: 'Object missing a rule or action attribute',
        });
      }
    }
  } else {
    throw new ValidationError({
      message: 'Objects not contained in an array',
    });
  }
} // validateDataArray

function validateBotsArray(inst, seq) {
  const bots = inst.dataValues.bots;

  return new seq.Promise((resolve, reject) => {
    if (!bots || !inst.changed('bots') || !bots.length) {
      resolve(inst);
    }

    if (bots.length > new Set(bots).size) {
      reject(new dbErrors.DuplicateBotError());
    }

    bots.forEach((botName, index) => {
      seq.models.Bot.findOne({
        where: {
          name: {
            [Op.iLike]: botName,
          },
        },
      })
      .then((o) => {
        if (!o) {
          reject(new dbErrors.ResourceNotFoundError({
            message: `Bot ${botName} not found`,
          }));
        }

        if (index === bots.length - 1) {
          resolve(inst);
        }
      });
    });
  });
} // validateBotsArray

module.exports = {
  validateSettingsArray,
  validateRulesArray,
  validateBotsArray,
}; // exports
