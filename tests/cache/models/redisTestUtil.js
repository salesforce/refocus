/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/redisTestUtil.js
 */
'use strict'; // eslint-disable-line strict
const Promise = require('bluebird');
const sampleStore = require('../../../cache/sampleStore');
const samstoinit = require('../../../cache/sampleStoreInit');
const rcli = require('../../../cache/redisCache').client.sampleStore;
const redisOps = require('../../../cache/redisOps');
const tu = require('../../testUtils');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const Sample = tu.db.Sample;
const testStartTime = new Date();
let a1;
let a2;
let s1;
let s2;
let s3;
function createThreeSamples() {
  tu.toggleOverride(sampleStore.constants.featureName, true);
  return Aspect.create({
    isPublished: true,
    name: `${tu.namePrefix}Aspect1`,
    timeout: '30s',
    valueType: 'NUMERIC',
    criticalRange: [0, 1],
    relatedLinks: [
      { name: 'Google', value: 'http://www.google.com' },
      { name: 'Yahoo', value: 'http://www.yahoo.com' },
    ],
  })
    .then((created) => (a1 = created))
    .then(() => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect2`,
      timeout: '10m',
      valueType: 'NUMERIC',
      okRange: [10, 100],
    }))
    .then((created) => (a2 = created))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject1`,
    }))
    .then((created) => (s1 = created))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject2`,
      parentId: s1.id,
    }))
    .then((created) => (s2 = created))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject3`,
      parentId: s1.id,
    }))
    .then((created) => (s3 = created))
    .then(() => Sample.create({
      messageCode: '25',
      subjectId: s2.id,
      aspectId: a1.id,
      value: '0',
      relatedLinks: [
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ],
    }))
    .then(() => Sample.create({
      messageCode: '50',
      subjectId: s2.id,
      aspectId: a2.id,
      value: '50',
      relatedLinks: [
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ],
    }))
    .then(() => Sample.create({
      previousStatus: 'Critical',
      messageCode: '10',
      subjectId: s3.id,
      aspectId: a1.id,
      value: '5',
      relatedLinks: [
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ],
    }));
}

module.exports = {
  populateRedis(done) {
    createThreeSamples()
      .then(() => samstoinit.populate())
      .then(() => done())
      .catch(done);
  },

  populateRedisSixSamples(done) {
    createThreeSamples()
      .then(() => Sample.create({
        previousStatus: 'Warning',
        messageCode: '55',
        subjectId: s1.id,
        aspectId: a1.id,
        value: '0',
        relatedLinks: [
          { name: 'Salesforce', value: 'http://www.salesforce.com' },
        ],
      }))
      .then(() => Sample.create({
        previousStatus: 'Warning',
        messageCode: '55',
        subjectId: s1.id,
        aspectId: a2.id,
        value: '-1',
        relatedLinks: [
          { name: 'Salesforce', value: 'http://www.salesforce.com' },
        ],
      }))
      .then(() => Sample.create({
        previousStatus: 'Warning',
        messageCode: '55',
        subjectId: s3.id,
        aspectId: a2.id,
        value: '5',
        relatedLinks: [
          { name: 'Salesforce', value: 'http://www.salesforce.com' },
        ],
      }))
      .then(() => samstoinit.populate())
      .then(() => done())
      .catch(done);
  },

  forceDeleteAspSampSubj(done) {
    tu.forceDelete(tu.db.Sample, testStartTime)
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    .then(done())
    .catch(done);
  },

  forceDeleteUserAndProf(done) {
    tu.forceDelete(tu.db.Profile, testStartTime)
    .then(() => tu.forceDelete(tu.db.User, testStartTime))
    .then(() => done())
    .catch(done);
  },

  flushRedis(done) {
    rcli.flushallAsync()
    .then(() => done())
    .catch(done);
  },

  forceDelete(done) {
    Promise.join(
      rcli.flushallAsync(),
      tu.forceDelete(tu.db.Sample, testStartTime)
        .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
        .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    )
    .then(() => done())
    .catch(done);
  },

  sampleStore,

  samstoinit,

  rcli,

  redisOps,
};
