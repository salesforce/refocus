/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collectorGroup/utils.js
 */

'use strict'; // eslint-disable-line strict
const tu = require('../../../testUtils');
const testStartTime = new Date();
const collName = `${tu.namePrefix}Collector`;
const collGroupName = `${tu.namePrefix}collGroupName`;
const collector = {
  name: collName,
  description: 'This is a mock collector object for testing.',
  helpEmail: 'test@test.com',
  helpUrl: 'http://test.com',
  host: 'xxx-yyy-zzz.aaa.bbb.ccc.com',
  ipAddress: '123.456.789.012',
  osInfo: {
    hostname: 'testHostname',
    username: 'testUsername',
  },
  processInfo: {
    execPath: 'testExecPath',
    memoryUsage: {
      heapTotal: 1234,
      external: 5678,
    },
    version: 'v1',
    versions: { a: 'a', b: 'b' },
  },
  version: '1.0.0',
};

const standardCollectorGroup = {
  name: collGroupName,
  description: 'This is a dummy collectorGroup object for testing.',
};

module.exports = {

  getCollectorObj() {
    return JSON.parse(JSON.stringify(collector));
  },

  createCollectorGroup() {
    return JSON.parse(JSON.stringify(standardCollectorGroup));
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.Collector, testStartTime)
    .then(() => tu.forceDelete(tu.db.CollectorGroup, testStartTime))
    .then(() => tu.forceDelete(tu.db.Generator, testStartTime))
    .then(() => tu.forceDelete(tu.db.GeneratorTemplate, testStartTime))
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => done())
    .catch(done);
  },
};
