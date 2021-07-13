/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const testStartTime = new Date();
const samstoinit = require('../../../../cache/sampleStoreInit');
const rcli = require('../../../../cache/redisCache').client.sampleStore;

const basic = {
  name: `${tu.namePrefix}TEST_SUBJECT`,
  isPublished: true,
};

module.exports = {
  getBasic(overrideProps={}) {
    if (!overrideProps.name) {
      delete overrideProps.name;
    }

    const defaultProps = JSON.parse(JSON.stringify(basic));
    return Object.assign(defaultProps, overrideProps);
  },

  createBasic(overrideProps={}) {
    const toCreate = this.getBasic(overrideProps);
    return tu.db.Subject.create(toCreate);
  },

  forceDelete(done, startTime=testStartTime) {
    Promise.all(
      samstoinit.eradicate(),
      tu.forceDelete(tu.db.Aspect, startTime)
      .then(() => tu.forceDelete(tu.db.Subject, startTime))
    )
    .then(() => done())
    .catch(done);
  },

  populateRedis(done) {
    samstoinit.populate()
    .then(() => done())
    .catch(done);
  },

};

