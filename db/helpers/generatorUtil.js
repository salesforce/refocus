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
'use strict'; // eslint-disable-line strict

const common = require('./common');
const dbErrors = require('../dbErrors');
const Op = require('sequelize').Op;

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

/*
 * Validate Subject Query
 *
 * @param {String} subjectQuery string
 * @return {String} returns Subject Query
 * @throws {ValidationError} Throw an error if subjectQuery fails following
 * criteria:
 * 1. subjectQuery must start with "?"
 * 2. subjectQuery must be longer than 6 characters
 * 3. Format of subjectQuery must be "?{key}={value}"
 * 4. Wildcard "*" is prohibited in the subjectQuery for "tag" filters
 */
function validateSubjectQuery(subjectQuery) {
  // subjectQuery should start with '?'
  if (subjectQuery.charAt(0) !== '?') {
    throw new dbErrors.ValidationError('subjectQuery ValidationError',
      'subjectQuery must start with "?"');
  }

  // size of subjectQuery should be greater than 6
  if (subjectQuery.length <= 6) {
    throw new dbErrors.ValidationError('subjectQuery ValidationError',
      'subjectQuery must be longer than 6 characters');
  }

  const subjectQueryString = subjectQuery.substr(1);
  const splitSubjectQuery = subjectQueryString.split('&');

  splitSubjectQuery.forEach((sq) => {
    const splitSQ = sq.split('=');

    if (splitSQ.length !== 2) {
      throw new dbErrors.ValidationError('subjectQuery ValidationError',
        'Format of subjectQuery must be "?{key}={value}"');
    }

    if (splitSQ[0] == 'tags' && splitSQ[1].indexOf('*') > -1) {
      throw new dbErrors.ValidationError('subjectQuery ValidationError',
        'Wildcard "*" is prohibited in the subjectQuery for "tag" filters');
    }
  });

  return subjectQuery;
}

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
 * @returns {Promise} with an array if check passed, error otherwise
 */
function checkCollectorsExist(seq, collectorNames) {
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
 * @returns {Promise} with collectors if validation and check pass,
 * rejected promise with the appropriate error otherwise.
 */
function validateCollectors(seq, collectorNames) {
  return new seq.Promise((resolve, reject) =>
    validateCollectorNames(collectorNames)
    .then(() => checkCollectorsExist(seq, collectorNames))
    .then(resolve)
    .catch(reject)
  );
}

/**
 * Used by db model.
 * Validate the collectorGroup name field: if succeed, return a promise with
 * the collectorGroup.
 * If fail, reject Promise with the appropriate error
 *
 * @param {Object} seq the Sequelize object
 * @param {String} collectorGroup name
 * @returns {Promise} with collectorGroup if validation pass,
 * rejected promise with the appropriate error otherwise.
 */
function validateCollectorGroup(seq, collectorGroupName) {
  if (!collectorGroupName) {
    return Promise.resolve(null);
  }

  return new seq.Promise((resolve, reject) =>
    seq.models.CollectorGroup.findOne({ where: { name: collectorGroupName } })
    .then((_cg) => {
      if (_cg) {
        resolve(_cg);
      }

      const err = new dbErrors.ResourceNotFoundError();
      err.resourceType = 'CollectorGroup';
      err.resourceKey = collectorGroupName;
      reject(err);
    })
  );
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

module.exports = {
  validateCollectorNames,
  checkCollectorsExist,
  validateCollectors,
  validateGeneratorCtx,
  validateSubjectQuery,
  validateCollectorGroup,
};
