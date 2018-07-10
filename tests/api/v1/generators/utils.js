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
'use strict'; // eslint-disable-line strict
const tu = require('../../../testUtils');
const gtUtil = require('../generatorTemplates/utils');
const testStartTime = new Date();
const Aspect = tu.db.Aspect;

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
  subjectQuery: '?absolutePath=Foo.*',
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
  return JSON.parse(JSON.stringify(GENERATOR_SIMPLE));
} // getGenerator

function createGeneratorAspects() {
  return Aspect.create({
    name: GENERATOR_SIMPLE.aspects[0], isPublished: true, timeout: '110s',
  })
  .then(() => Aspect.create({
    name: GENERATOR_SIMPLE.aspects[1], isPublished: true, timeout: '110s',
  }));
}

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.Generator, testStartTime)
    .then(() => tu.forceDelete(tu.db.Collector, testStartTime))
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => done())
    .catch(done);
  },

  getGenerator,
  gtUtil,
  createSGtoSGTMapping,
  createGeneratorAspects,
};
