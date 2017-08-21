/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/utils.js
 */
'use strict';
const tu = require('../../../testUtils');

const testStartTime = new Date();

const GENERATOR_SIMPLE = {
  name: 'refocus-ok-generator',
  description: 'Collect status data',
  tags: [
    'status',
    'STATUS',
  ],
  generatorTemplate: {
    name: 'refocus-ok-generator-template',
    version: '1.0.0',
  },
  context: {
    okValue: {
      required: false,
      default: '0',
      description: 'An ok sample\'s value, e.g. \'0\'',
    },
  },
  helpUrl: 'http://help.com',
  helpEmail: 'refocus-gt@refocus.rf',
  subjectQuery: '?subjects',
  aspects: ['Temperature', 'Weather'],
};

/**
 * Function to get a simple generator
 * @returns {Object} - Generator object
 */
function getGenerator() {
  return GENERATOR_SIMPLE;
} // getGenerator

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.Generator, testStartTime)
    .then(() => tu.forceDelete(tu.db.Collector, testStartTime))
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => done())
    .catch(done);
  },

  getGenerator,
};
