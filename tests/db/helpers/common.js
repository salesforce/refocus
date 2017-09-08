/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/helpers/common.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../testUtils');
const u = require('../model/subject/utils');
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const Sample = tu.db.Sample;
const common = require('../../../db/helpers/common');

describe('tests/db/helpers/common.js >', () => {
  after(u.forceDelete);

  describe('setDifference >', () => {
    const array1 = [1, 2, 3, 4];
    const array2 = [3, 4];
    const array3 = [6, 7, 8];

    it('non-overlap: return all of array A', () => {
      const result = common.setDifference(array1, array3);
      expect(result).to.deep.equal(array1);
    });

    it('some overlap: return the non-overlapping strings', () => {
      const result = common.setDifference(array1, array2);
      expect(result).to.deep.equal([1, 2]);
    });

    it('entirely overlap: return empty array', () => {
      const result = common.setDifference(array1, array1);
      expect(result.length).to.equal(0);
    });
  });

  describe('sortArrayAccordingToAnotherArray >', () => {
    const sortedArr = [
      'before',
      'middle',
      'after',
    ];
    const nonSortedArr = [
      { name: 'after', extraField: 2222 },
      { name: 'before' },
      { name: 'middle' },
    ];

    it('input: two arrays of same size, sort the previous according to the latter',
    () => {
      const result = common.sortArrayAccordingToAnotherArray(nonSortedArr, sortedArr);
      for (let i = result.length - 1; i >= 0; i--) {
        expect(result[i].name).to.equal(sortedArr[i]);
      }

      expect(result[2].extraField).to.equal(nonSortedArr[0].extraField);
    });

    it('different length of array input, return empty arr', () => {
      const result = common.sortArrayAccordingToAnotherArray(nonSortedArr, []);
      expect(result).to.deep.equal([]);
    });

    it('both null input, return empty arr', () => {
      const result = common.sortArrayAccordingToAnotherArray();
      expect(result).to.deep.equal([]);
    });
  });

  describe('publishChange function >', () => {
    it('create a model', (done) => {
      const par = { name: `${tu.namePrefix}Alpha`, isPublished: true };
      Subject.create(par)
      .then((o) => {
        const obj = common.publishChange(o, 'add');
        expect(obj).to.have.property('add');
        done();
      })
      .catch(done);
    });

    it('destory with a model', (done) => {
      const par = { name: `${tu.namePrefix}Gamma`, isPublished: true };
      Subject.create(par)
      .then((o) => o.destroy())
      .then((o) => {
        const obj = common.publishChange(o, 'delete');
        expect(obj).to.have.property('delete');
        done();
      })
      .catch(done);
    });

    it('update a model instance', (done) => {
      const par = { name: `${tu.namePrefix}Kappa`, isPublished: false };
      Subject.create(par)
      .then((o) => o.update({ isPublished: true }))
      .then((o) => {
        const changedKeys = Object.keys(o._changed);
        const ignoreAttributes = ['isDeleted'];
        const obj = common.publishChange(o, 'update', changedKeys,
          ignoreAttributes);
        expect(obj.update).to.have.property('new');
        done();
      })
      .catch(done);
    });

    it('update a fields in a model that' +
        ' is a part of ignoreAttributes ', (done) => {
      const par = { name: `${tu.namePrefix}Delta`, isPublished: false };
      Subject.create(par)
      .then((o) => o.update({ isPublished: true }))
      .then((o) => {
        const changedKeys = Object.keys(o._changed);
        const ignoreAttributes = changedKeys;
        const obj = common.publishChange(o, 'update', changedKeys,
          ignoreAttributes);
        expect(obj.update).to.equal(null);
        done();
      })
      .catch(done);
    });

    it('update a model instance field with the same field ' +
      'in ignoreAttributes', (done) => {
      const par = { name: `${tu.namePrefix}Eta`, isPublished: false };
      Subject.create(par)
      .then((o) => o.update({ isPublished: true }))
      .then((o) => {
        const changedKeys = Object.keys(o._changed);
        const ignoreAttributes = changedKeys;
        const obj = common.publishChange(o, 'update', changedKeys,
          ignoreAttributes);
        expect(obj.update).to.equal(null);
        done();
      })
      .catch(done);
    });
  });
  describe('test sampleAspectAndSubjectArePublished and ' +
  'augmentSampleWithSubjectAspectInfo function >', () => {
    let sub;
    before((done) => {
      Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}Aspect`,
        timeout: '30s',
        valueType: 'NUMERIC',
      })
      .then(() => Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject`,
      }))
      .then((s) => {
        sub = s;
        done();
      })
      .catch(done);
    });

    it('sampleAspectAndSubjectArePublished : check for true', (done) => {
      Sample.upsertByName({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect`,
        value: '1',
      })
      .then((samp) =>
        common.sampleAspectAndSubjectArePublished(tu.db.sequelize, samp))
      .then((pub) => {
        expect(pub).to.equal(true);
      })
      .then(() => done())
      .catch(done);
    });

    it('augmentSampleWithSubjectAspectInfo : returned sample should have' +
        ' subject and aspect information', (done) => {
      Sample.upsertByName({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect`,
        value: '1',
      })
      .then((samp) =>
        common.augmentSampleWithSubjectAspectInfo(tu.db.sequelize, samp))
      .then((sam) => {
        expect(sam.subject.name).to.equal(`${tu.namePrefix}Subject`);
        expect(sam.aspect.name).to.equal(`${tu.namePrefix}Aspect`);
        expect(sam.subject.tags).to.be.instanceof(Array);
        expect(sam.aspect.tags).to.to.be.instanceof(Array);
      })
      .then(() => done())
      .catch(done);
    });
  });
});
