/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/subjects/subjectCRUD.js
 */
'use strict'; // eslint-disable-line strict

const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const samstoinit = rtu.samstoinit;
const redisStore = rtu.sampleStore;
const redisClient = rtu.redisClient;
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const expect = require('chai').expect;
const Sample = tu.db.Sample;
const subjectIndexName = redisStore.constants.indexKey.subject;
const sampleIndexName = redisStore.constants.indexKey.sample;

describe('redis: subject: CRUD: ', () => {
  const par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  const parUnPub =
        { name: `${tu.namePrefix}SouthAmerica`, isPublished: false };

  const aspectTemp = {
    name: 'temperature',
    timeout: '30s',
    isPublished: true,
    tags: ['temp'],
  };
  const aspectHumid = {
    name: 'humidity',
    timeout: '30s',
    isPublished: true,
  };
  const sample1 = { value: '10' };
  const sample2 = { value: '10' };

  let ipar;
  let iparUnPub;
  let aspTempId;

  beforeEach((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    Subject.create(par)
    .then((subj) => {
      ipar = subj.id;
      sample1.subjectId = subj.id;
      sample2.subjectId = subj.id;
      return Subject.create(parUnPub);
    })
    .then((subUnPub) => {
      iparUnPub = subUnPub.id;
      return Aspect.create(aspectHumid);
    })
    .then((asp) => {
      sample1.aspectId = asp.id;
      return Aspect.create(aspectTemp);
    })
    .then((asp) => {
      aspTempId = asp.id;
      sample2.aspectId = asp.id;
      return Sample.create(sample1);
    })
    .then(() => Sample.create(sample2))
    .then(() => done())
    .catch(done);
  });

  afterEach(rtu.forceDelete);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('an entry for created subject should be found', (done) => {
    Subject.findById(ipar)
    .then((subj) => {
      const key = redisStore.toKey('subject', subj.absolutePath);
      return redisClient.sismemberAsync(subjectIndexName, key);
    })
    .then((ok) => {
      expect(ok).to.equal(1);
      done();
    })
    .catch(done);
  });

  it('unpublished subject should not be found but should be found ' +
                  ' after it is published', (done) => {
    let subj;
    let key;
    Subject.findById(iparUnPub)
    .then((sub) => {
      subj = sub;
      key = redisStore.toKey('subject', subj.absolutePath);
      return redisClient.sismemberAsync(subjectIndexName, key);
    })
    .then((ok) => {
      expect(ok).to.equal(0);
      return subj.update({ isPublished: true });
    })
    .then(() => redisClient.sismemberAsync(subjectIndexName, key))
    .then((ok) => {
      expect(ok).to.equal(1);
      done();
    })
    .catch(done);
  });

  it('when asbolutepath changes, the subjectStore should reflect' +
   ' this change', (done) => {
    let oldAbsPath;
    let newAbsPath;
    Subject.findById(ipar)
    .then((subj) => {
      oldAbsPath = subj.absolutePath;
      return subj.update({ name: subj.name + '_newName' });
    })
    .then((subj) => {
      const newKey = redisStore.toKey('subject', subj.absolutePath);
      newAbsPath = subj.absolutePath;
      return redisClient.sismemberAsync(subjectIndexName, newKey);
    })
    .then((ok) => {
      // new key should be found
      expect(ok).to.equal(1);
      const oldKey = redisStore.toKey('subject', oldAbsPath);
      return redisClient.sismemberAsync(subjectIndexName, oldKey);
    })
    .then((ok) => {
      // old key should not be found
      expect(ok).to.equal(0);
      return redisClient.keysAsync(newAbsPath + '*');
    })
    .then((ret) => {
      // since sample store has not been popluated yet. rename should not create
      // a new entry in sample store.
      expect(ret.length).to.equal(0);
      done();
    })
    .catch(done);
  });

  it('when asbolutepath changes, the sampleStore should reflect ' +
     ' this change', (done) => {
    let oldAbsPath;
    let newAbsPath;

    samstoinit.populate()
    .then(() => Subject.findById(ipar))
    .then((subj) => {
      oldAbsPath = subj.absolutePath;
      return subj.update({ name: subj.name + '_newName' });
    })
    .then((subj) => {
      const newKey = redisStore.toKey('subject', subj.absolutePath);
      newAbsPath = subj.absolutePath;
      return redisClient.sismemberAsync(subjectIndexName, newKey);
    })
    .then((ok) => {
      // new key should be found
      expect(ok).to.equal(1);
      const oldKey = redisStore.toKey('subject', oldAbsPath);
      return redisClient.sismemberAsync(subjectIndexName, oldKey);
    })
    .then((ok) => {
      // old key should not be found
      expect(ok).to.equal(0);
      return redisClient.smembersAsync(sampleIndexName);
    })
    .then((members) => {
      const oldAbsPathWithPrefix = redisStore.toKey('sample', oldAbsPath);
      const newAbsPathWithPrefix = redisStore.toKey('sample', newAbsPath);
      const samplesWithOldName = [];
      const samplesWithNewName = [];
      // sample with old subject name should not be found
      members.forEach((member) => {
        const nameParts = member.split('|');
        if (nameParts[0] === oldAbsPathWithPrefix) {
          samplesWithOldName.push(member);
        } else if (nameParts[0] === newAbsPathWithPrefix) {
          samplesWithNewName.push(members);
        }
      });

      // only samples with new name should be found
      expect(samplesWithNewName.length).to.equal(2);

      // all the samples related to the subject should be deleted
      expect(samplesWithOldName.length).to.equal(0);
      done();
    })
    .catch(done);
  });

  it('once a subject is destroyed no entry should be found in the master ' +
      ' subject index', (done) => {
    Subject.findById(ipar)
    .then((s) => s.destroy())
    .then((subj) => {
      const key = redisStore.toKey('subject', subj.absolutePath);
      return redisClient.sismemberAsync(subjectIndexName, key);
    })
    .then((ok) => {
      expect(ok).to.equal(0);
      done();
    })
    .catch(done);
  });

  it('once a subject is destroyed all the related samples should be ' +
      'removed from the samplestore', (done) => {

    // of the form samsto:samples:
    let subjectWithPrefix;
    samstoinit.populate()
    .then(() => Subject.findById(ipar))
    .then((s) => s.destroy())
    .then((subj) =>  {
      subjectWithPrefix = redisStore.toKey('sample', subj.absolutePath);
      return Aspect.findById(aspTempId);
    })
    .then((a) => a.destroy())
    .then(() => {
      return redisClient.smembersAsync(sampleIndexName);
    })
    .then((members) => {
      members.forEach((member) => {
        const nameParts = member.split('|');
        // all the samples related to the subject should be deleted
        expect(nameParts[0]).not.equal(subjectWithPrefix);
      });
      done();
    })
    .catch(done);
  });

  it('when a subject is unpublished all its related samples should be ' +
      'removed from the samplestore', (done) => {

    // of the form samsto:samples:
    let subjectWithPrefix;
    samstoinit.populate()
    .then(() => Subject.findById(ipar))
    .then((s) => s.update({ isPublished: false }))
    .then((subj) =>  {
      subjectWithPrefix = redisStore.toKey('sample', subj.absolutePath);
      return Aspect.findById(aspTempId);
    })
    .then((a) => a.destroy())
    .then(() => {
      return redisClient.smembersAsync(sampleIndexName);
    })
    .then((members) => {
      members.forEach((member) => {
        const nameParts = member.split('|');

        // all the samples related to the subject should be deleted
        expect(nameParts[0]).not.equal(subjectWithPrefix);
      });
      done();
    })
    .catch(done);
  });
});

