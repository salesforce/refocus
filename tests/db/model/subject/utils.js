/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/utils.js
 */
'use strict';
const tu = require('../../../testUtils');

const testStartTime = new Date();

const subjectPrototype = {
  description: 'description description description description     ',
  helpEmail: 'foo@bar.com',
  helpUrl: 'http://www.bar.com',
  imageUrl: 'http://www.bar.com/foo.jpg',
  isPublished: true,
};

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.Sample, testStartTime)
    .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => tu.forceDelete(tu.db.Tag, testStartTime))
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
    .then(() => done())
    .catch(done);
  },

  getSubjectPrototype(name, parentId) {
    const s = JSON.parse(JSON.stringify(subjectPrototype));
    s.name = name;
    s.parentId = parentId;
    s.sortBy = null;
    return s;
  },
};
