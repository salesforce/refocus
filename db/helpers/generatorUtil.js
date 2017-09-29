/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/generatorUtil.js
 */
const common = require('./common');
const dbErrors = require('../dbErrors');

/**
 * Function to validate the context field of the sample generator based on the
 * contextDefinition field of its related generator template.
 * @param  {Object} sgCtx - The generator context object     [description]
 * @param  {Object} sgtCtxDef - The related sample generator template context
 * definition object
 * @throws {MissingRequiredFieldrror} If the generator context field does not
 * have the attributes that are required by the context definiton field of the
 * sample generator template
 * @throws {ValidationError} If the number of keys in the generator context do
 * not match the number of keys in the generator template context.
 */
function validateGeneratorCtx(sgCtx, sgtCtxDef) {
  const sgtCtxDefKeys = sgtCtxDef ? Object.keys(sgtCtxDef) : [];
  const sgCtxKeys = sgCtx ? Object.keys(sgCtx) : [];
  const sgtCtxDefKeysSet = new Set(sgtCtxDefKeys);

  const invalidKeys = sgCtxKeys.filter((key) => !sgtCtxDefKeysSet.has(key));
  if (invalidKeys.length) {
    throw new dbErrors.ValidationError(
      { explanation: 'Sample generator context contains invalid ' +
      `keys: ${invalidKeys}`,
    });
  }

  sgtCtxDefKeys.forEach((key) => {
    if (sgtCtxDef[key].required && (!sgCtx || !sgCtx[key])) {
      const err = new dbErrors.MissingRequiredFieldError(
      { explanation: `Missing the required generator context field ${key}` }
      );
      throw err;
    }
  });
} // validateCtxRequiredFields

/**
 * Reject the request if collectorNames contain duplicate names
 * @param {Array} collectorNames Array of strings
 * @returns {Promise} empty if validation passed, reject otherwise
 */
function validateCollectorNames(collectorNames) {
  if (common.checkDuplicatesInStringArray(collectorNames)) {
    const err = new dbErrors.DuplicateCollectorError();
    err.resourceType = 'Collector';
    err.resourceKey = collectorNames;
    return Promise.reject(err);
  }

  return Promise.resolve();
}

/**
 * If collectors exist, return a Promise with an
 * Array of collector objects referenced by collectorNames.
 * If collector names are not supplied, return a Promise
 * with an empty array
 * If collector names are invalid, reject with error.

 * @param {Object} seq The sequelize object
 * @param {Array} collectorNames Array of Strings
 * @param {Function} whereClauseForNameInArr Passed in from API
 * @returns {Promise} with an array if check passed, error otherwise
 */
function checkCollectorsExist(seq,
  collectorNames, whereClauseForNameInArr) {
  if (!collectorNames || !collectorNames.length) {
    return [];
  }

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
 * @param {Function} whereClauseForNameInArr Passed in from API
 * @returns {Promise} with collectors if validation and check pass,
 * rejected promise with the appropriate error otherwise.
 */
function validateCollectors(seq, collectorNames,
  whereClauseForNameInArr) {
  return new seq.Promise((resolve, reject) =>
    validateCollectorNames(collectorNames)
    .then(() => checkCollectorsExist(
      seq, collectorNames, whereClauseForNameInArr))
    .then(resolve)
    .catch(reject)
  );
}

module.exports = {
  validateCollectorNames,
  checkCollectorsExist,
  validateCollectors,
  validateGeneratorCtx,
};
