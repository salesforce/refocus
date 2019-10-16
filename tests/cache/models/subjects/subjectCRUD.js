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
const subjectUtils = require('../../../../db/helpers/subjectUtils');
const rtu = require('../redisTestUtil');
const redisStore = rtu.sampleStore;
const objectType = redisStore.constants.objectType;
const rcli = rtu.rcli;
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const expect = require('chai').expect;
const Sample = tu.Sample;
const sampleIndexName = redisStore.constants.indexKey.sample;
const redisOps = rtu.redisOps;

describe('tests/cache/models/subjects/subjectCRUD.js >', () => {
  const parentName = `${tu.namePrefix}NorthAmerica`;
  const par = { name: parentName, isPublished: true, absolutePath: parentName,
    tags: ['parent'], };
  const parUnPub = {
    name: `${tu.namePrefix}SouthAmerica`,
    isPublished: false,
    tags: ['parent', 'unpub'],
  };
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
  after(tu.forceDeleteUser);

  it('on unpublish, a subject should still be found', (done) => {
    const subjectKey = redisStore.toKey('subject', parentName);

    Subject.findByPk(ipar)
    .then((pubishedSubject) => pubishedSubject.update({ isPublished: false }))
    .then(() =>
      rcli.sismemberAsync(redisStore.constants.indexKey.subject, subjectKey))
    .then((ok) => {
      expect(ok).to.equal(1);
      return rcli.hgetallAsync(subjectKey);
    })
    .then((subject) => {
      expect(subject).to.not.equal(null);
      expect(subject.name).to.equal(parentName);
      expect(subject.isPublished).to.equal('false');
      done();
    })
    .catch(done);
  });

  it('created subject should be found, tags should be found', (done) => {
    let absolutePath;

    Subject.findByPk(ipar)
    .then((subj) => {
      absolutePath = subj.absolutePath;
      return redisOps.batchCmds()
        .keyExistsInIndex(objectType.subject, absolutePath)
        .getHash('subject', absolutePath)
        .getSubjectTags(subj)
        .exec();
    })
    .then((res) => {
      expect(res.length).to.equal(3);
      expect(res[0]).to.equal(1);
      expect(res[1].absolutePath).to.equal(absolutePath);
      expect(res[2]).to.have.members(par.tags);
      done();
    })
    .catch(done);
  });

  it('unpublished subject should be found, tags key should not be found',
    (done) => {
    let subj;
    let key;

    Subject.findByPk(iparUnPub)
    .then((sub) => {
      subj = sub;
      return redisOps.batchCmds()
        .keyExistsInIndex(objectType.subject, subj.absolutePath)
        .getHash('subject', subj.absolutePath)
        .getSubjectTags(subj)
        .exec();
    })
    .then((res) => {
      expect(res.length).to.equal(3);

      // confirms that unpublished subject was added to the master subject list
      expect(res[0]).to.equal(1);

      // confirms that unpublished subject was created in redis
      expect(res[1].absolutePath).to.equal(subj.absolutePath);
      expect(res[1].id).to.equal(iparUnPub);
      expect(res[2]).to.have.members([]);
      return done();
    })
    .catch(done);
  });

  it('when absolutePath changes, the subjectStore should reflect this change',
  (done) => {
    const newName = par.name + '_newName';
    let oldAbsPath;
    let newAbsPath;

    Subject.findByPk(ipar)
    .then((subj) => {
      oldAbsPath = subj.absolutePath;
      return subj.update({ name: newName });
    })
    .then((subj) => {
      newAbsPath = subj.absolutePath;
      return redisOps.batchCmds()
        .keyExistsInIndex(objectType.subject, oldAbsPath)
        .getHash('subject', oldAbsPath)
        .keyExistsInIndex(objectType.subject, newAbsPath)
        .getHash('subject', newAbsPath)
        .getSubjectTags({ absolutePath: oldAbsPath })
        .getSubjectTags(subj)
        .exec();
    })
    .then((res) => {
      expect(res.length).to.equal(6);

      // old abspath should be removed from the subject index
      expect(res[0]).to.equal(0);

      // the old absolutePath key should be removed
      expect(res[1]).to.equal(null);

      // new abspath should be added to the subject index
      expect(res[2]).to.equal(1);

      // new absolutePath key should be mapped to the id
      expect(res[3].id).to.equal(ipar);
      expect(res[3].absolutePath).to.equal(newName);

      expect(res[4]).to.have.members([]); // tags keys not found for old abs path
      expect(res[5]).to.have.members(par.tags); // tags found for new abs path
      return rcli.keysAsync(newAbsPath + '*');
    })
    .then((ret) => {
      /*
       * since sample store has not been popluated yet. rename should not create
       * a new entry in sample store.
       */
      expect(ret.length).to.equal(0);
      done();
    })
    .catch(done);
  });

  it('when absolutePath and tags changes, the subject should be updated ' +
    'and the samples should be deleted, tags key should be updated', (done) => {
    let oldAbsPath;
    let newAbsPath;
    const ARRAY = 'abcd'.split('');

    Subject.findByPk(ipar)
    .then((subj) => {
      oldAbsPath = subj.absolutePath;
      return subj.update({ name: subj.name + '_newName', tags: ARRAY });
    })
    .then((subj) => {
      newAbsPath = subj.absolutePath;
      return redisOps.batchCmds()
        .keyExistsInIndex(objectType.subject, oldAbsPath)
        .getHash('subject', oldAbsPath)
        .keyExistsInIndex(objectType.subject, newAbsPath)
        .getHash('subject', newAbsPath)
        .getSubjectTags({ absolutePath: oldAbsPath })
        .getSubjectTags(subj)
        .exec();
    })
    .then((res) => {
      expect(res.length).to.equal(6);

      // old abspath should be removed from the subject index
      expect(res[0]).to.equal(0);

      // the old absolutePath key should be removed
      expect(res[1]).to.equal(null);

      // new abspath should be added to the subject index
      expect(res[2]).to.equal(1);

      // new absolutePath key should be mapped to the subject
      expect(res[3].id).to.equal(ipar);
      expect(res[3].tags).to.deep.equal(JSON.stringify(ARRAY));
      expect(res[3].absolutePath).to.equal(newAbsPath);

      expect(res[4]).to.have.members([]); // tags keys not found for old abs path
      expect(res[5]).to.have.members(ARRAY); // tags found for new abs path

      return rcli.smembersAsync(sampleIndexName);
    })
    .then((members) => {
      const oldAbsPathWithPrefix = redisStore.toKey('sample', oldAbsPath);
      const newAbsPathWithPrefix = redisStore.toKey('sample', newAbsPath);
      const samplesWithOldName = [];
      const samplesWithNewName = [];
      /* sample with old subject name should not be found */
      members.forEach((member) => {
        const nameParts = member.split('|');
        if (nameParts[0] === oldAbsPathWithPrefix) {
          samplesWithOldName.push(member);
        } else if (nameParts[0] === newAbsPathWithPrefix) {
          samplesWithNewName.push(members);
        }
      });

      // samples should not be renamed to match the new subject absolute path
      expect(samplesWithNewName.length).to.equal(0);

      // all the samples related to the subject should be deleted
      expect(samplesWithOldName.length).to.equal(0);

      /*
       * 1. the subject to aspect mapping for the subject with the old
       * absolutepath should also be deleted
       *
       * 2. the subject to aspect mapping for the subject with the new
       * absolutepath should also be created
       *
       * 3. aspect-to-subject mapping should be updated
       */
      return redisOps.batchCmds()
        .getSubjAspMapMembers(oldAbsPath)
        .getSubjAspMapMembers(newAbsPath)
        .subjAbsPathExistsInAspSet(aspectTemp.name, oldAbsPath)
        .subjAbsPathExistsInAspSet(aspectHumid.name, oldAbsPath)
        .subjAbsPathExistsInAspSet(aspectTemp.name, newAbsPath)
        .subjAbsPathExistsInAspSet(aspectHumid.name, newAbsPath)
        .exec();
    })
    .then((values) => {
      expect(values[0]).to.be.empty;

      expect(values[1].length).to.be.equal(2);
      expect(values[1]).to.include.members(['humidity', 'temperature']);
      expect(values[2]).to.be.equal(0);
      expect(values[3]).to.be.equal(0);
      expect(values[4]).to.be.equal(1);
      expect(values[5]).to.be.equal(1);
      return done();
    })
    .catch(done);
  });

  it('once a subject is destroyed no entry should be found in the master ' +
  'subject index, tags key should be deleted', (done) => {
    let found;
    Subject.findByPk(ipar)
    .then((s) => {
      found = s;
      return s.destroy();
    })
    .then((subj) =>
      redisOps.batchCmds()
        .keyExistsInIndex(objectType.subject, par.absolutePath)
        .getHash('subject', par.absolutePath)
        .getSubjectTags(par)
        .exec()
    )
    .then((res) => {
      expect(res.length).to.equal(3);
      expect(res[0]).to.equal(0);
      expect(res[1]).to.equal(null);
      expect(res[2]).to.have.members([]);
      done();
    })
    .catch(done);
  });

  it('removeFromRedis removes all the related samples ' +
    'from the samplestore', (done) => {
    subjectUtils.removeFromRedis(par)
    .then(() => rcli.smembersAsync(sampleIndexName))
    .then((members) => {
      expect(members.length).to.equal(0);
      const subAspMapKey = redisStore.toKey('subaspmap', parentName);
      return rcli.smembersAsync(subAspMapKey);
    })
    .then((members) => {
      expect(members.length).to.equal(0);
      return redisOps.batchCmds()
        .getAspSubjMapMembers(aspectTemp.name)
        .getAspSubjMapMembers(aspectHumid.name)
        .getSubjectTags(par)
        .exec();
    })
    .then((res) => {
      expect(res.length).to.equal(3);
      expect(res[0].length).to.equal(0);
      expect(res[1].length).to.equal(0);
      expect(res[2]).to.have.members([]);
      return done();
    })
    .catch(done);
  });

  it('once a subject is destroyed all the related samples should be ' +
  'removed from the samplestore', (done) => {
    // of the form samsto:samples:
    let subjectWithPrefix;
    Subject.findByPk(ipar)
    .then((s) => s.destroy())
    .then(() => rcli.smembersAsync(sampleIndexName))
    .then((members) => {
      expect(members.length).to.equal(0);

      //subaspmap key is deleted
      const subAspMapKey = redisStore.toKey('subaspmap', par.name);
      return rcli.smembersAsync(subAspMapKey);
    })
    .then((members) => {
      expect(members.length).to.equal(0);

      // aspsubmaps do not have this subject
      return redisOps.batchCmds()
        .getAspSubjMapMembers(aspectTemp.name)
        .getAspSubjMapMembers(aspectHumid.name)
        .getSubjectTags(par)
        .exec();
    })
    .then((res) => {
      expect(res.length).to.equal(3);
      expect(res[0].length).to.equal(0);
      expect(res[1].length).to.equal(0);
      expect(res[2]).to.have.members([]);
      return done();
    })
    .catch(done);
  });

  it('when a subject is unpublished all its related samples should be ' +
  'removed from the samplestore, tags key should be deleted', (done) => {
    // of the form samsto:samples:
    let subjectWithPrefix;
    Subject.findByPk(ipar)
    .then((s) => s.update({ isPublished: false }))
    .then((subj) => {
      subjectWithPrefix = redisStore.toKey('sample', subj.absolutePath);
      return rcli.smembersAsync(sampleIndexName);
    })
    .then((members) => {
      members.forEach((member) => {
        const nameParts = member.split('|');

        // all the samples related to the subject should be deleted
        expect(nameParts[0]).not.equal(subjectWithPrefix);
      });

      const subAspMapKey = redisStore.toKey('subaspmap', par.name);
      return rcli.smembersAsync(subAspMapKey);
    })
    .then((members) => {
      expect(members.length).to.equal(0);
      return redisOps.batchCmds()
        .getAspSubjMapMembers(aspectTemp.name)
        .getAspSubjMapMembers(aspectHumid.name)
        .getSubjectTags(par)
        .exec();
    })
    .then((res) => {
      expect(res.length).to.equal(3);
      expect(res[0].length).to.equal(0);
      expect(res[1].length).to.equal(0);
      expect(res[2]).to.have.members([]);
      return done();
    })
    .catch(done);
  });
});

describe('tests/cache/models/subjects/subjectCRUD.js> isPublished cases',
() => {
  afterEach(rtu.forceDelete);

  it('create subject with isPublished false, check tags and related links',
  (done) => {
    Subject.create({
      name: `${tu.namePrefix}s4`,
      isPublished: false,
      tags: ['tag1', 'tag2'],
      relatedLinks: [
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ],
    })
    .then((subj) =>
      redisOps.batchCmds()
        .keyExistsInIndex(objectType.subject, subj.absolutePath)
        .getHash('subject', subj.absolutePath)
        .getSubjectTags(subj)
        .exec()
    )
    .then((res) => {
      expect(res.length).to.equal(3);
      expect(res[0]).to.equal(1);
      const subj = redisStore.arrayObjsStringsToJson(res[1],
        redisStore.constants.fieldsToStringify.subject);
      expect(subj.isPublished).to.equal('false');
      expect(Array.isArray(subj.tags)).to.be.equal(true);
      expect(Array.isArray(subj.relatedLinks)).to.be.equal(true);
      expect(subj.tags).to.deep.equal(['tag1', 'tag2']);
      expect(subj.relatedLinks).to.deep.equal([
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ]);

      expect(res[2]).to.have.members([]);
      return done();
    })
    .catch(done);
  });

  it('create subject with isPublished true, check tags and related links',
  (done) => {
    Subject.create({
      name: `${tu.namePrefix}s4`,
      isPublished: true,
      tags: ['tag1', 'tag2'],
      relatedLinks: [
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ],
    })
    .then((subj) =>
      redisOps.batchCmds()
        .keyExistsInIndex(objectType.subject, subj.absolutePath)
        .getHash('subject', subj.absolutePath)
        .getSubjectTags(subj)
        .exec()
    )
    .then((res) => {
      expect(res.length).to.equal(3);
      expect(res[0]).to.equal(1);
      const subj = redisStore.arrayObjsStringsToJson(res[1],
        redisStore.constants.fieldsToStringify.subject);
      expect(subj.isPublished).to.equal('true');
      expect(Array.isArray(subj.tags)).to.be.equal(true);
      expect(Array.isArray(subj.relatedLinks)).to.be.equal(true);
      expect(subj.tags).to.deep.equal(['tag1', 'tag2']);
      expect(subj.relatedLinks).to.deep.equal([
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ]);
      expect(res[2]).to.have.members(['tag1', 'tag2']);
      return done();
    })
    .catch(done);
  });

  it('update subject with isPublished false, check tags and related links',
  (done) => {
    Subject.create({
      name: `${tu.namePrefix}s4`,
      isPublished: true,
      tags: ['tag1', 'tag2'],
      relatedLinks: [
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ],
    })
    .then((subj) => subj.update({ isPublished: false }))
    .then((subj) =>
      redisOps.batchCmds()
        .keyExistsInIndex(objectType.subject, subj.absolutePath)
        .getHash('subject', subj.absolutePath)
        .getSubjectTags(subj)
        .exec()
    )
    .then((res) => {
      expect(res.length).to.equal(3);
      expect(res[0]).to.equal(1);
      const subj = redisStore.arrayObjsStringsToJson(res[1],
        redisStore.constants.fieldsToStringify.subject);
      expect(subj.isPublished).to.equal('false');
      expect(Array.isArray(subj.tags)).to.be.equal(true);
      expect(Array.isArray(subj.relatedLinks)).to.be.equal(true);
      expect(subj.tags).to.deep.equal(['tag1', 'tag2']);
      expect(subj.relatedLinks).to.deep.equal([
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ]);
      expect(res[2]).to.have.members([]);
      return done();
    })
    .catch(done);
  });

  it('update subject with isPublished to true, update tags',
  (done) => {
    Subject.create({
      name: `${tu.namePrefix}s4`,
      isPublished: false,
      tags: ['tag1', 'tag2'],
      relatedLinks: [
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ],
    })
    .then((subj) => subj.update({ isPublished: true, tags: ['tags3'] }))
    .then((subj) =>
      redisOps.batchCmds()
        .keyExistsInIndex(objectType.subject, subj.absolutePath)
        .getHash('subject', subj.absolutePath)
        .getSubjectTags(subj)
        .exec()
    )
    .then((res) => {
      expect(res.length).to.equal(3);
      expect(res[0]).to.equal(1);
      const subj = redisStore.arrayObjsStringsToJson(res[1],
        redisStore.constants.fieldsToStringify.subject);
      expect(subj.isPublished).to.equal('true');
      expect(Array.isArray(subj.tags)).to.be.equal(true);
      expect(Array.isArray(subj.relatedLinks)).to.be.equal(true);
      expect(subj.tags).to.deep.equal(['tags3']);
      expect(subj.relatedLinks).to.deep.equal([
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ]);

      expect(res[2]).to.have.members(['tags3']);
      return done();
    })
    .catch(done);
  });

  it('unpublished subject should be created on create and deleted on delete',
  (done) => {
    let subInst;
    Subject.create({
      name: `${tu.namePrefix}s4`,
      isPublished: false,
      tags: ['tag1', 'tag2'],
      relatedLinks: [
         { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ],
    })
    .then((subj) => {
      subInst = subj;
      return redisOps.batchCmds()
        .keyExistsInIndex(objectType.subject, subj.absolutePath)
        .getHash('subject', subj.absolutePath)
        .exec();
    })
    .then((res) => {
      expect(res[0]).to.equal(1);
      const subj = redisStore.arrayObjsStringsToJson(res[1],
        redisStore.constants.fieldsToStringify.subject);
      expect(subj.isPublished).to.equal('false');
      expect(Array.isArray(subj.tags)).to.be.equal(true);
      expect(Array.isArray(subj.relatedLinks)).to.be.equal(true);
      expect(subj.tags).to.deep.equal(['tag1', 'tag2']);
      expect(subj.relatedLinks).to.deep.equal([
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ]);
    })
    .then(() => subInst.destroy())
    .then((subj) =>
      redisOps.batchCmds()
        .keyExistsInIndex(objectType.subject, subInst.absolutePath)
        .getHash('subject', subInst.absolutePath)
        .getSubjectTags(subInst)
        .exec()
    )
    .then((res) => {
      expect(res.length).to.equal(3);
      expect(res[0]).to.equal(0);
      expect(res[1]).to.equal(null);
      expect(res[2]).to.have.members([]);
      return done();
    })
    .catch(done);
  });
});

