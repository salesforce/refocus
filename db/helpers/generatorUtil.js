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

const dbErrors = require('../dbErrors');
const ValidationError = dbErrors.ValidationError;
const common = require('./common');
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

    if (splitSQ[0] === 'tags' && splitSQ[1].indexOf('*') > -1) {
      throw new dbErrors.ValidationError('subjectQuery ValidationError',
        'Wildcard "*" is prohibited in the subjectQuery for "tag" filters');
    }

    if (splitSQ[0] === 'isPublished' && splitSQ[1] === 'false') {
      throw new dbErrors.ValidationError('subjectQuery ValidationError',
        'Cannot generate samples for subjects with isPublished=false');
    }
  });

  return subjectQuery;
}

/**
 * Used by db model.
 * Validate the collectorGroup name field: if succeed, return a promise with
 * the collectorGroup.
 * If fail, reject Promise with the appropriate error
 *
 * @param {Object} seq - the Sequelize object
 * @param {String} collectorGroupName - name of a collectorGroup
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

        const err = new dbErrors.ResourceNotFoundError(
          `CollectorGroup "${collectorGroupName}" not found.`
        );
        err.resourceType = 'CollectorGroup';
        err.resourceKey = collectorGroupName;
        reject(err);
      })
  );
}

/**
 * Used by db model.
 * Validate the generators field: if succeed, return a promise with
 * the generator instances.
 * If fail, reject Promise with the appropriate error
 *
 * @param {Object} seq the Sequelize object
 * @param {Array} generatorNames Array of generator names
 * @returns {Promise} with collectors if validation and check pass,
 * rejected promise with the appropriate error otherwise.
 */
function validateGeneratorNames(seq, generatorNames) {
  if (!generatorNames || !generatorNames.length) {
    return Promise.resolve([]);
  }

  if (common.checkDuplicatesInStringArray(generatorNames)) {
    throw new dbErrors.DuplicateGeneratorError({
      resourceType: 'Generator',
      resourceKey: generatorNames,
    });
  }

  if (!generatorNames || !generatorNames.length) return [];

  return seq.models.Generator.findAll({
    where: { name: { [Op.in]: generatorNames } },
  })
  .then((generators) => {
    if (generators.length === generatorNames.length) {
      return generators;
    } else {
      throw new dbErrors.ResourceNotFoundError({
        resourceType: 'Generator',
        resourceKey: generatorNames,
      });
    }
  });
}

/**
 * Checks if any of the generators in the array is already assigned to a group.
 * @param {Array<Object>} arr - array of generator objects
 * @returns {Array<Object>} the original array
 */
function alreadyAssigned(arr) {
  const toReject = arr.filter((generator) => generator.collectorGroup);
  if (toReject.length === 0) {
    return arr;
  }

  const names = toReject.map((c) => c.name);
  const msg = `Cannot double-assign generator(s) [${names.join(', ')}] to ` +
    'collector groups';
  throw new ValidationError(msg);
} // alreadyAssigned

/**
 * Checks if any of the generators in the array is already assigned to a group
 * other than the one specified
 * @param {Array<Object>} arr - array of generator objects
 * @param {CollectorGroup} group - collector group
 * @returns {Array<Object>} the original array
 */
function alreadyAssignedToOtherGroup(arr, group) {
  const toReject = arr.filter((generator) =>
    generator.collectorGroup && generator.collectorGroup.id !== group.id
  );
  if (toReject.length === 0) {
    return arr;
  }

  const names = toReject.map((g) => g.name);
  const msg = `Cannot double-assign generator(s) [${names.join(', ')}] to ` +
    'collector groups';
  throw new ValidationError(msg);
} // alreadyAssignedToOtherGroup

module.exports = {
  validateGeneratorCtx,
  validateSubjectQuery,
  validateCollectorGroup,
  validateGeneratorNames,
  alreadyAssignedToOtherGroup,
  alreadyAssigned,
};
