/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generatortemplate/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const gtUtil = require('../generatortemplate/utils');
const testStartTime = new Date();

const GENERATOR_SIMPLE = {
  name: 'refocus-ok-generator',
  description: 'Collect status data',
  tags: [
    'status',
    'STATUS',
  ],
  generatorTemplate: {
    name: 'refocus-ok-template',
    version: '1.0.0',
  },
  context: {
    okValue: {
      default: '0',
      description: 'An ok sample\'s value, e.g. \'0\'',
    },
    password: 'superlongandsupersecretpassword',
    token: 'alphanumerictoken',
  },
  helpUrl: 'http://help.com',
  helpEmail: 'refocus-gt@refocus.rf',
  subjectQuery: '?subjects',
  aspects: ['Temperature', 'Weather'],
};

/**
 * Given a sample generator template sgt and a sample generator sg, assign the
 * sgt name and sgt version to sg.generatorTemplate.name and
 * sg.generatorTemplate.version keys of sg.
 * @param  {Object} sgt - Sample Generator Template object
 * @param  {Object} sg  - Sample Generator oject
 */
function createSGtoSGTMapping(sgt, sg) {
  sg.generatorTemplate.name = sgt.name;
  sg.generatorTemplate.version = sgt.version;
}

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

  forceDeleteCollector(done) {
    tu.forceDelete(tu.db.Collector, testStartTime)
    .then(() => done())
    .catch(done);
  },

  getGenerator,

  gtUtil,

  createSGtoSGTMapping,
};
