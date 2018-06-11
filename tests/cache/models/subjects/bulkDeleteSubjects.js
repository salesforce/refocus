/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/subjects/bulkDeleteSubjects.js
 */
'use strict'; // eslint-disable-line strict
const testUtils = require('../../../testUtils');
const subjectUtils = require('../../../../db/helpers/subjectUtils');
const redisTestUtil = require('../redisTestUtil');
const redisStore = redisTestUtil.sampleStore;
const objectType = redisStore.constants.objectType;
const rcli = redisTestUtil.rcli;
const Subject = testUtils.db.Subject;
const Aspect = testUtils.db.Aspect;
const expect = require('chai').expect;
const Sample = testUtils.Sample;
const sampleIndexName = redisStore.constants.indexKey.sample;
const redisOps = redisTestUtil.redisOps;

describe('tests/cache/models/subjects/bulkDeleteSubjects.js >', () => {
  const SAMPLE_NORTH_AMERICA = `${testUtils.namePrefix}NorthAmerica`;
  const SAMPLE_SOUTH_AMERICA = `${testUtils.namePrefix}SouthAmerica`;
  const subject = {
    name: SAMPLE_NORTH_AMERICA,
    isPublished: true,
    absolutePath: SAMPLE_NORTH_AMERICA,
  };
  const parUnPub = {
    name: SAMPLE_SOUTH_AMERICA,
    isPublished: false,
  };
  const temperatureAspect = {
    name: 'temperature',
    timeout: '30s',
    isPublished: true,
    tags: ['temp'],
  };
  const humidityAspect = {
    name: 'humidity',
    timeout: '30s',
    isPublished: true,
  };
  const sample1 = { value: '10' };
  const sample2 = { value: '10' };

  let subjectId;

  beforeEach((done) => {
    Subject.create(subject)
    .then((subj) => {
      subjectId = subj.id;
      sample1.subjectId = subj.id;
      sample2.subjectId = subj.id;
      return Subject.create(parUnPub);
    })
    .then(() => Aspect.create(humidityAspect))
    .then((aspect) => {
      sample1.aspectId = aspect.id;
      return Aspect.create(temperatureAspect);
    })
    .then((asp) => {
      sample2.aspectId = asp.id;
      return Sample.create(sample1);
    })
    .then(() => Sample.create(sample2))
    .then(() => done())
    .catch(done);
  });

  // delete whole DB
  afterEach(redisTestUtil.forceDelete);
  after(testUtils.forceDeleteUser);

  it('created subject should be found', (done) => {
    let absolutePath;

    Subject.findById(subjectId)
    .then((subj) => {
      absolutePath = subj.absolutePath;
      const key = redisStore.toKey('subject', absolutePath);
      const cmds = [];
      cmds.push(redisOps.keyExistsInIndexCmd(objectType.subject,
        absolutePath));
      cmds.push(['hgetall', key]);
      return redisOps.executeBatchCmds(cmds);
    })
    .then((res) => {
      expect(res[0]).to.equal(1);
      expect(res[1].absolutePath).to.equal(absolutePath);
      done();
    })
    .catch(done);
  });

  it('removeFromRedis removes all the related samples ' +
    'from the samplestore', (done) => {
    const ZERO = 0;
    subjectUtils.removeFromRedis(subject)
      .then(() => rcli.smembersAsync(sampleIndexName))
      .then((members) => {
        expect(members.length).to.equal(ZERO);
        const subAspMapKey = redisStore.toKey('subaspmap', subject.name);
        return rcli.smembersAsync(subAspMapKey);
      })
      .then((members) => {
        expect(members.length).to.equal(ZERO);
        return done();
      })
      .catch(done);
  });

  it('removeFromRedis removes all the related samples ' +
    'from the samplestore', (done) => {
    const ZERO = 0;
    subjectUtils.removeFromRedis(subject)
      .then(() => rcli.smembersAsync(sampleIndexName))
      .then((members) => {
        expect(members.length).to.equal(ZERO);
        const subAspMapKey = redisStore.toKey('subaspmap', subject.name);
        return rcli.smembersAsync(subAspMapKey);
      })
      .then((members) => {
        expect(members.length).to.equal(ZERO);
        return done();
      })
      .catch(done);
  });
});
