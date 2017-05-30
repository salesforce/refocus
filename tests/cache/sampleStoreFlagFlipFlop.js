/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/sampleStoreFlagFlipFlop.js
 */
'use strict'; // eslint-disable-line strict
const sampleStore = require('../../cache/sampleStore');
const samstoinit = require('../../cache/sampleStoreInit');
const redisClient = require('../../cache/redisCache').client.sampleStore;
const featureToggles = require('feature-toggles');
const expect = require('chai').expect;
const tu = require('../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const Sample = tu.db.Sample;
const initialFeatureState = featureToggles
  .isFeatureEnabled(sampleStore.constants.featureName);

describe('sampleStore (feature off):', () => {
  before(() => tu.toggleOverride(sampleStore.constants.featureName, false));

  after(() => tu.toggleOverride(sampleStore.constants.featureName,
    initialFeatureState));

  it('init', (done) => {
    samstoinit.init()
    .then((res) => expect(res).to.be.false)
    .then(() => done())
    .catch(done);
  });
});

describe('sampleStore flag flip flop:', () => {
  let a1;
  let a2;
  let a3;
  let a4;
  let s1;
  let s2;
  let s3;

  before((done) => {
    tu.toggleOverride(sampleStore.constants.featureName, false);
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
    .then(() => Aspect.create({
      isPublished: false,
      name: `${tu.namePrefix}Aspect4`,
      timeout: '10m',
      valueType: 'BOOLEAN',
      okRange: [10, 100],
    }))
    .then((created) => (a4 = created))
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
      ]
    }))
    .then(() => Sample.create({
      subjectId: s2.id,
      aspectId: a2.id,
      value: '50',
      relatedLinks: [
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ]
    }))
    .then(() => Sample.create({
      subjectId: s3.id,
      aspectId: a1.id,
      value: '5',
      relatedLinks: [
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ]
    }))
    .then(() => done())
    .catch(done);
  });

  after((done) => {
    u.forceDelete(done)
    .then(() => redisClient.flushallAsync())
    .then(() => tu.toggleOverride(sampleStore.constants.featureName,
      initialFeatureState))
    .then(() => done())
    .catch(done);
  });

  it('flag from false to false: cache should not be populated', (done) => {
    samstoinit.eradicate()
    .then(() => tu.toggleOverride(sampleStore.constants.featureName, false))
    .then(() => samstoinit.init())
    .then((res) => expect(res).to.be.false)
    .then(() =>
      redisClient.smembersAsync(sampleStore.constants.indexKey.aspect))
    .then((res) => {
      expect(res).to.have.length(0);
    })
    .then(() => redisClient
      .smembersAsync(sampleStore.constants.indexKey.sample))
    .then((res) => {
      expect(res).to.have.length(0);
    })
    .then(() => redisClient
      .smembersAsync(sampleStore.constants.indexKey.subject))
    .then((res) => {
      expect(res).to.have.length(0);
    })
    .then(() => done())
    .catch(done);
  });

  it('flag from false to true: cache should be populated', (done) => {
    let subjectIdToTest;
    samstoinit.eradicate()
    .then(() => tu.toggleOverride(sampleStore.constants.featureName, true))
    .then(() => samstoinit.init())
    .then((res) => expect(res).to.not.be.false)
    .then(() =>
      redisClient.smembersAsync(sampleStore.constants.indexKey.aspect))
    .then((res) => {
      expect(res.includes('samsto:aspect:___aspect1')).to.be.true;
      expect(res.includes('samsto:aspect:___aspect2')).to.be.true;

      // Make sure aspects that don't have samples are *also* here
      expect(res.includes('samsto:aspect:___aspect3')).to.be.true;

      // Make sure unpublished aspects are *not* here
      expect(res.includes('samsto:aspect:___aspect4')).to.be.false;
    })
    .then(() => redisClient
      .smembersAsync(sampleStore.constants.indexKey.sample))
    .then((res) => {
      expect(res.includes('samsto:sample:___subject1.___subject2|___aspect1'))
        .to.be.true;
      expect(res.includes('samsto:sample:___subject1.___subject2|___aspect2'))
        .to.be.true;
      expect(res.includes('samsto:sample:___subject1.___subject3|___aspect1'))
        .to.be.true;
    })
    .then(() => redisClient
      .smembersAsync(sampleStore.constants.indexKey.subject))
    .then((res) => {
      expect(res.includes('samsto:subject:___subject1.___subject2'))
        .to.be.true;
      expect(res.includes('samsto:subject:___subject1.___subject3'))
        .to.be.true;
    })
    .then(() => redisClient.hgetallAsync('samsto:subject:___subject1.___subject3'))
    .then((res) => {
      expect(res).to.not.be.null;
      subjectIdToTest = res.id;
    })
    .then(() => redisClient
      .hgetallAsync('samsto:sample:___subject1.___subject3|___aspect1'))
    .then((res) => {
      expect(res).to.have.property('subjectId', subjectIdToTest);
    })
    .then(() => done())
    .catch(done);
  });

  it('flag from true to false: cache should be eradicated ' +
      ' and db should be populated', (done) => {
    samstoinit.eradicate()
    .then(() => tu.toggleOverride(sampleStore.constants.featureName, true))
    .then(() => samstoinit.init())
    .then(() => Sample.destroy({ truncate: true, force: true }))
    .then(() => tu.toggleOverride(sampleStore.constants.featureName, false))
    .then(() => samstoinit.init())
    .then((res) => expect(res).to.not.be.false)
    .then(() =>
      redisClient.smembersAsync(sampleStore.constants.indexKey.aspect))
    .then((res) => {
      expect(res).to.have.length(0);
    })
    .then(() => redisClient
      .smembersAsync(sampleStore.constants.indexKey.sample))
    .then((res) => {
      expect(res).to.have.length(0);
    })
    .then(() => redisClient
      .smembersAsync(sampleStore.constants.indexKey.subject))
    .then((res) => {
      expect(res).to.have.length(0);
    })
    .then(() => Sample.findAll())
    .then((samples) => {
      expect(samples).to.have.length(3);
    })
    .then(() => done())
    .catch(done);
  });
});
