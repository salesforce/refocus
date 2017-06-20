/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collector/utils.js
 */
'use strict'; // eslint-disable-line strict

const tu = require('../../../testUtils');
const seq = require('../../../../db/utils').seq;

const testStartTime = new Date();
const cname = `${tu.namePrefix}Collector`;

module.exports = {
  collectorObj: {
    name: cname,
    description: 'This is a mock collector object for testing.',
    helpEmail: 'test@test.com',
    helpUrl: 'http://test.com',
  },

  forceDelete(done) {
    // Using raw query because delete is restricted using ORM in delete hooks
    seq.query('DELETE from "Collectors"')
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => done())
    .catch(done);
  },
};
