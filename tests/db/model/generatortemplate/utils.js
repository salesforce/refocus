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

const testStartTime = new Date();

const GT_SIMPLE = {
  name: 'refocus-ok-template',
  description: 'Collect status data',
  tags: [
    'status',
    'STATUS',
  ],
  author: {
    name: 'Salesforce CX Tools',
    email: 'SiteReliabilityTools@salesforce.com',
    url: 'https://www.authorinfo.com',
  },
  repository: {
    type: 'git',
    url: 'git+https://github.com/templates/template-generators.git',
  },
  connection: {
    url: '{{baseTrustUrl}}/v1/instances/status/preview',
    method: 'GET',
    proxy: 'pro.xy.server.net',
    bulk: false,
  },
  transform: 'return [{ name: "S1|A1", value: 10 }, ' +
    '{ name: "S2|A1", value: 2 }] ',
  contextDefinition: {
    okValue: {
      required: false,
      default: '0',
      description: 'An ok sample\'s value, e.g. \'0\'',
    },
    password: {
      required: false,
      description: 'password required to log in',
      encrypted: false,
    },
    token: {
      required: false,
      description: 'token required to be passed on to the header',
      encrypted: false,
    },
  },
  helpUrl: 'http://help.com',
  helpEmail: 'refocus-gt@refocus.rf',
  isPublished: true,
};

/**
 * Function to get a simple generator template
 * @returns {Object} - Generator Template object
 */
function getGeneratorTemplate() {
  return JSON.parse(JSON.stringify(GT_SIMPLE));
} // getGeneratorTemplate

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.Generator, testStartTime)
    .then(() => tu.forceDelete(tu.db.GeneratorTemplate, testStartTime))
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => done())
    .catch(done);
  },

  getGeneratorTemplate,
};
