/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/aspects/aspectCRUD.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const samstoinit = rtu.samstoinit;
const redisStore = rtu.sampleStore;
const rcli = rtu.rcli;
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const expect = require('chai').expect;
const Sample = tu.db.Sample;
const subjectIndexName = redisStore.constants.indexKey.subject;
const sampleIndexName = redisStore.constants.indexKey.sample;
const aspectIndexName = redisStore.constants.indexKey.aspect;

describe('tests/cache/models/aspects/aspectCRUD.js, ' +
'redis: aspect: create >', () => {
  const par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };

  // const parUnPub =
  //       { name: `${tu.namePrefix}SouthAmerica`, isPublished: false };

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
  const aspWindChill = {
    name: 'wind-chill',
    timeout: '30s',
    isPublished: false,
  };
  const sample1 = { value: '10' };
  const sample2 = { value: '10' };

  let ipar;
  let aspTempId;
  let aspHumdId;
  let aspWCId;

  beforeEach((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    Subject.create(par)
    .then((subj) => {
      ipar = subj.id;
      sample1.subjectId = subj.id;
      sample2.subjectId = subj.id;
      return Aspect.create(aspectHumid);
    })
    .then((asp) => {
      aspHumdId = asp.id;
      sample1.aspectId = asp.id;
      return Aspect.create(aspectTemp);
    })
    .then((asp) => {
      aspTempId = asp.id;
      sample2.aspectId = asp.id;
      return Sample.create(sample1);
    })
    .then(() => Aspect.create(aspWindChill))
    .then((asp) => {
      aspWCId = asp.id;
      return Sample.create(sample2);
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(rtu.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('time fields should have the expected format', (done) => {
    let aspKey;
    Aspect.findById(aspHumdId)
    .then((asp) => {
      aspKey = redisStore.toKey('aspect', asp.name);
      return rcli.sismemberAsync(aspectIndexName, aspKey);
    })
    .then(() => rcli.hgetallAsync(aspKey))
    .then((asp) => {
      expect(asp.updatedAt).to.equal(new Date(asp.updatedAt).toISOString());
      expect(asp.createdAt).to.equal(new Date(asp.createdAt).toISOString());
      done();
    })
    .catch(done);
  });

  it('published aspects created should have an entry in aspectStore and ' +
  'the aspect hash should also be created', (done) => {
    let aspKey;
    Aspect.findById(aspHumdId)
    .then((asp) => {
      aspKey = redisStore.toKey('aspect', asp.name);
      return rcli.sismemberAsync(aspectIndexName, aspKey);
    })
    .then((ok) => {
      expect(ok).to.equal(1);
      return rcli.hgetallAsync(aspKey);
    })
    .then((asp) => {
      expect(asp).to.not.equal(null);
      expect(asp.name).to.equal(aspectHumid.name);
      expect(asp.isPublished).to.equal('true');
      expect(asp.timeout).to.equal('30s');
      done();
    })
    .catch(done);
  });

  it('unpublished aspect should be found', (done) => {
    let aspect;
    let aspectKey;
    Aspect.findById(aspWCId)
    .then((asp) => {
      aspect = asp;
      aspectKey = redisStore.toKey('aspect', asp.name);
      return rcli.sismemberAsync(aspectIndexName, aspectKey);
    })
    .then((ok) => {
      expect(ok).to.equal(1);
      return aspect.update({ isPublished: true });
    })
    .then(() => rcli.sismemberAsync(aspectIndexName, aspectKey))
    .then((ok) => {
      expect(ok).to.equal(1);
      return rcli.hgetallAsync(aspectKey);
    })
    .then((asp) => {
      expect(asp).to.not.equal(null);
      expect(asp.timeout).to.equal('30s');
      expect(asp.name).to.equal(aspWindChill.name);
      expect(asp.isPublished).to.equal('true');
      done();
    })
    .catch(done);
  });

  it('when aspect is updated, the aspect hash should reflect this',
  (done) => {
    Aspect.findById(aspTempId)
    .then((asp) => asp.update({
      tags: ['cold', 'verycold'],
      rank: 10,
      criticalRange: [0, 0],
      warningRange: [1, 1],
    }))
    .then((asp) => {
      const aspectKey = redisStore.toKey('aspect', asp.name);
      return rcli.hgetallAsync(aspectKey);
    })
    .then((asp) => {
      expect(asp).to.not.equal(null);
      expect(JSON.parse(asp.tags)).to.have.members(['cold', 'verycold']);
      expect(JSON.parse(asp.warningRange)).to.have.members([1, 1]);
      expect(JSON.parse(asp.criticalRange)).to.have.members([0, 0]);
      expect(asp.rank).to.equal('10');
      expect(asp.timeout).to.equal('30s');
      expect(asp.name).to.equal(aspectTemp.name);
      expect(asp.isPublished).to.equal('true');
      done();
    })
    .catch(done);
  });

  it('when aspect name changes, the aspectStore should ' +
    'reflect this change', (done) => {
    let oldName;
    let newName;
    Aspect.findById(aspTempId)
    .then((asp) => {
      oldName = asp.name;
      return asp.update({ name: asp.name + '_newName' });
    })
    .then((asp) => {
      const newKey = redisStore.toKey('aspect', asp.name);
      newName = asp.name;
      return rcli.sismemberAsync(aspectIndexName, newKey);
    })
    .then((ok) => {
      // new key should be found
      expect(ok).to.equal(1);
      const oldKey = redisStore.toKey('aspect', oldName);
      return rcli.sismemberAsync(aspectIndexName, oldKey);
    })
    .then((ok) => {
      // old key should not be found
      expect(ok).to.equal(0);
      return rcli.keysAsync(newName + '*');
    })
    .then((ret) => {
      // since sample store has not been popluated yet. rename should not
      // create a new entry in sample store.
      expect(ret.length).to.equal(0);
      done();
    })
    .catch(done);
  });

  it('when name changes, the sampleStore reflect this change', (done) => {
    let oldName;
    let newName;

    samstoinit.populate()
    .then(() => Aspect.findById(aspHumdId))
    .then((asp) => {
      oldName = asp.name;
      return asp.update({ name: asp.name + '_newName' });
    })
    .then((asp) => {
      const newKey = redisStore.toKey('aspect', asp.name);
      newName = asp.name;
      return rcli.sismemberAsync(aspectIndexName, newKey);
    })
    .then((ok) => {
      // new key should be found
      expect(ok).to.equal(1);
      const oldKey = redisStore.toKey('aspect', oldName);
      return rcli.sismemberAsync(subjectIndexName, oldKey);
    })
    .then((ok) => {
      // old key should not be found
      expect(ok).to.equal(0);
      return rcli.smembersAsync(sampleIndexName);
    })
    .then((members) => {
      const oldNameWithPrefix = redisStore.toKey('sample', oldName);
      const newNameWithPrefix = redisStore.toKey('sample', newName);
      const samplesWithOldName = [];
      const samplesWithNewName = [];

      // sample with old aspect name or new aspect name should not be found
      members.forEach((member) => {
        const nameParts = member.split('|');
        if (nameParts[0] === oldNameWithPrefix) {
          samplesWithOldName.push(member);
        } else if (nameParts[0] === newNameWithPrefix) {
          samplesWithNewName.push(members);
        }
      });

      // only samples with new name should be found
      expect(samplesWithNewName.length).to.equal(0);

      // all the samples related to the aspect should be deleted
      expect(samplesWithOldName.length).to.equal(0);
      done();
    })
    .catch(done);
  });

  it('once an aspect is destroyed no entry should be found in the ' +
  'aspectStore and the corresponding hash set should not be found', (done) => {
    let aspectKey;
    Aspect.findById(aspHumdId)
    .then((a) => a.destroy())
    .then((asp) => {
      aspectKey = redisStore.toKey('aspect', asp.name);
      return rcli.sismemberAsync(subjectIndexName, aspectKey);
    })
    .then((ok) => {
      expect(ok).to.equal(0);
      return rcli.hgetallAsync(aspectKey);
    })
    .then((asp) => {
      expect(asp).to.equal(null);
      done();
    })
    .catch(done);
  });

  it('once an aspect is destroyed all the related samples should be ' +
  'removed from the samplestore', (done) => {
    // of the form samsto:samples:
    let aspectName;
    samstoinit.populate()
    .then(() => Aspect.findById(aspTempId))
    .then((a) => a.destroy())
    .then((a) => {
      aspectName = a.name;
      return Subject.findById(ipar);
    })
    .then((s) => s.destroy())
    .then(() => rcli.smembersAsync(sampleIndexName))
    .then((members) => {
      members.forEach((member) => {
        const nameParts = member.split('|');

        // all the samples related to the subject should be deleted
        expect(nameParts[1]).not.equal(aspectName);
      });
      done();
    })
    .catch(done);
  });

  it('when an aspect is unpublished it should' +
  'remain in the samplestore', (done) => {
    // of the form samsto:samples:
    const aspectKey = redisStore.toKey('aspect', aspectHumid.name);
    samstoinit.populate()
    .then(() => Aspect.findById(aspHumdId))
    .then((a) => a.update({ isPublished: false }))
    .then((a) => rcli.sismemberAsync(aspectIndexName, aspectKey))
    .then((ok) => {
      expect(ok).to.equal(1);
      return rcli.hgetallAsync(aspectKey);
    })
    .then((asp) => {
      expect(asp).to.not.equal(null);
      expect(asp.timeout).to.equal('30s');
      expect(asp.name).to.equal(aspectHumid.name);
      expect(asp.isPublished).to.equal('false');
      done();
    })
    .catch(done);
  });

  it('when an aspect is unpublished all its related samples should be ' +
  'removed from the samplestore', (done) => {
    // of the form samsto:samples:
    let aspectName;
    samstoinit.populate()
    .then(() => Aspect.findById(aspHumdId))
    .then((a) => a.update({ isPublished: false }))
    .then((a) => {
      aspectName = a.name;
      return Subject.findById(ipar);
    })
    .then((s) => s.destroy())
    .then(() => rcli.smembersAsync(sampleIndexName))
    .then((members) => {
      members.forEach((member) => {
        const nameParts = member.split('|');

        // all the samples related to the aspect should be deleted
        expect(nameParts[0]).not.equal(aspectName);
      });
      done();
    })
    .catch(done);
  });

  it('Create, isPublished false, check tags and related links', (done) => {
    Aspect.create({
      name: `${tu.namePrefix}ASPECTNAME`,
      isPublished: false,
      timeout: '110s',
      tags: ['tag1', 'tag2'],
      relatedLinks: [
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ],
    })
    .then((asp) => {
      expect(Array.isArray(asp.tags)).to.be.equal(true);
      expect(Array.isArray(asp.relatedLinks)).to.be.equal(true);
      expect(asp.tags).to.deep.equal(['tag1', 'tag2']);
      expect(asp.relatedLinks).to.deep.equal([
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ]);
      return done();
    })
    .catch(done);
  });

  it('Create, isPublished true, check tags and related links', (done) => {
    Aspect.create({
      name: `${tu.namePrefix}ASPECTNAME`,
      isPublished: true,
      timeout: '110s',
      tags: ['tag1', 'tag2'],
      relatedLinks: [
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ],
    })
    .then((asp) => {
      expect(Array.isArray(asp.tags)).to.be.equal(true);
      expect(Array.isArray(asp.relatedLinks)).to.be.equal(true);
      expect(asp.tags).to.deep.equal(['tag1', 'tag2']);
      expect(asp.relatedLinks).to.deep.equal([
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ]);
      return done();
    })
    .catch(done);
  });

  it('Update, isPublished false, check tags and related links', (done) => {
    Aspect.create({
      name: `${tu.namePrefix}ASPECTNAME`,
      isPublished: true,
      timeout: '110s',
      tags: ['tag1', 'tag2'],
      relatedLinks: [
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ],
    })
    .then((asp) => asp.update({ isPublished: false }))
    .then((asp) => {
      expect(Array.isArray(asp.tags)).to.be.equal(true);
      expect(Array.isArray(asp.relatedLinks)).to.be.equal(true);
      expect(asp.tags).to.deep.equal(['tag1', 'tag2']);
      expect(asp.relatedLinks).to.deep.equal([
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ]);
      return done();
    })
    .catch(done);
  });

  it('Update, isPublished true, check tags and related links', (done) => {
    Aspect.create({
      name: `${tu.namePrefix}ASPECTNAME`,
      isPublished: false,
      timeout: '110s',
      tags: ['tag1', 'tag2'],
      relatedLinks: [
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ],
    })
    .then((asp) => asp.update({ isPublished: true }))
    .then((asp) => {
      expect(Array.isArray(asp.tags)).to.be.equal(true);
      expect(Array.isArray(asp.relatedLinks)).to.be.equal(true);
      expect(asp.tags).to.deep.equal(['tag1', 'tag2']);
      expect(asp.relatedLinks).to.deep.equal([
        { name: 'link name 1', url: 'http://abc.com' },
        { name: 'link name 2', url: 'http://xyz.com' },
      ]);
      return done();
    })
    .catch(done);
  });
});
