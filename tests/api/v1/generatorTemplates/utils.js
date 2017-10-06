/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generatorTemplates/utils.js
 */
'use strict';
const tu = require('../../../testUtils');

const testStartTime = new Date();

const GENERATOR_TEMPLATE_SIMPLE = {
  description: 'this is a generator template...',
  name: 'template0',
  version: '1.0.0',
  tags: [
    'tag1',
  ],
  author: {
    name: 'author1',
    url: 'http://www.aaa.com',
    email: 'a@aaa.com',
  },
  connection: {
    method: 'GET',
    url: 'http://www.bbb.com',
    bulk: false,
  },
  transform: 'function...',
  isPublished: true,
  helpEmail: 'a@aaa.com',
  helpUrl: 'aaa.com',
  repository: {
    url: 'http://aaa.com',
    type: 'GitHub',
  },
  contextDefinition: {
    okValue: {
      required: false,
      default: '0',
      description: 'An ok sample\'s value, e.g. \'0\'',
    },
    criticalValue: {
      required: false,
      default: '2',
      description: 'A critical sample\'s value, e.g. \'1\'',
    },
  },
};

/**
 * Function to get a simple generatorTemplate
 * @returns {Object} - GeneratorTemplate object
 */
function getGeneratorTemplate() {
  return JSON.parse(JSON.stringify(GENERATOR_TEMPLATE_SIMPLE));
} // getGenerator

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.GeneratorTemplate, testStartTime)
    .then(() => tu.forceDelete(tu.db.Collector, testStartTime))
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => done())
    .catch(done);
  },

  getGeneratorTemplate,
};
