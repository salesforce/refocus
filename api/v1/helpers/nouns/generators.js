/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/generators.js
 */
'use strict';  // eslint-disable-line strict

const Generator = require('../../../../db/index').Generator;
const Collector = require('../../../../db/index').Collector;

const m = 'generator';

/**
 * Function to modify the where clause passed to the database model.
 * We want to lookup a Generators currentCollector by name, so we need
 * to add a include.where instead of the default where clause.
 * @param  {Object} params  - The request params
 * @param  {Object} options - The options object that will be passed to the
 * Sequelize find function
 * @returns {Object} options object with the "where" clause modified
 */
function modifyWhereClause(params, options) {
  if (options.where.currentCollector) {
    const nameStr = options.where.currentCollector;
    options.include = [
      {
        model: Collector,
        as: 'currentCollector',
        where: { name: nameStr, },
      },
    ];
    delete options.where.currentCollector;
  }

  return options;
}

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/generators',
  model: Generator,
  modelName: 'Generator',
  modifyWhereClause,

  // define the associations that are to be deleted here
  belongsToManyAssoc: {
    users: 'writers',
  },
  fieldsWithArrayType: ['tags'],
  tagFilterName: 'tags',
  fieldScopeMap: {
    user: 'user',
    possibleCollectors: 'possibleCollectors',
    currentCollector: 'currentCollector',
  },

  /*
   * list the fields containing an array of objects to be sorted here. The value
   * defines the field that will be used for comparision
   */
  sortArrayObjects: {
    possibleCollectors: 'name',
  },
  readOnlyFields: ['id', 'isDeleted', 'currentCollector'],

}; // exports
