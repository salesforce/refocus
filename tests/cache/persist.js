/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/persist.js
 */
'use strict'; // eslint-disable-line strict
const sampleStore = require('../../cache/sampleStore');
const samstoinit = require('../../cache/sampleStoreInit');
const samstopersist = require('../../cache/sampleStorePersist');
const rcli = require('../../cache/redisCache').client.sampleStore;
const featureToggles = require('feature-toggles');
const expect = require('chai').expect;
const tu = require('../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const initialFeatureState = featureToggles
  .isFeatureEnabled(sampleStore.constants.featureName);

describe('tests/cache/persist.js, persist sample store back to db >', () => {
  let a1;
  let a2;
  let a3;
  let s1;
  let s2;
  let s3;

  before((done) => {
    tu.toggleOverride(sampleStore.constants.featureName, true);
    Aspect.create({
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
      valueType: 'BOOLEAN',
      okRange: [10, 100],
    }))
    .then((created) => (a2 = created))
    .then(() => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect3`,
      timeout: '10m',
      valueType: 'BOOLEAN',
      okRange: [10, 100],
    }))
    .then((created) => (a3 = created))
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
      subjectId: s2.id,
      aspectId: a1.id,
      value: '0',
      relatedLinks: [
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ],
    }))
    .then(() => Sample.create({
      subjectId: s2.id,
      aspectId: a2.id,
      value: '50',
      relatedLinks: [
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ],
    }))
    .then(() => Sample.create({
      subjectId: s3.id,
      aspectId: a1.id,
      value: '5',
      relatedLinks: [
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ],
    }))
    .then(() => done())
    .catch(done);
  });

  after((done) => {
    u.forceDelete(done)
    .then(() => rcli.flushallAsync())
    .then(() => tu.toggleOverride(sampleStore.constants.featureName,
      initialFeatureState))
    .then(() => done())
    .catch(done);
  });

  it('ok', (done) => {
    samstoinit.eradicate()
    .then(() => samstoinit.populate())
    .then(() => rcli.scardAsync(sampleStore.constants.indexKey.sample))
    .then((res) => expect(res).to.eql(3))
    .then(() => Sample.destroy({
      where: {
        name: `${tu.namePrefix}Subject1.${tu.namePrefix}Subject2` +
          `|${tu.namePrefix}Aspect1`,
      },
    }))
    .then(() => samstopersist.persist())
    .then(() => Sample.findAll())
    .then((res) => expect(res.length).to.eql(3))
    .then(() => done())
    .catch(done);
  });
});
