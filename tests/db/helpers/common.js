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
const common = require('../../../db/helpers/common');

describe('tests/db/helpers/common.js >', () => {
  after(u.forceDelete);

  describe('checkDuplicatesInStringArray >', () => {
    it('empty input returns false', () => {
      expect(common.checkDuplicatesInStringArray()).to.be.false;
    });

    it('empty array input returns false', () => {
      expect(common.checkDuplicatesInStringArray([])).to.be.false;
    });

    it('all identical elements returns true', () => {
      expect(common.checkDuplicatesInStringArray(['a', 'a', 'a'])).to.be.true;
    });

    it('no duplicates return false', () => {
      expect(common.checkDuplicatesInStringArray(['a', 'b', 'c'])).to.be.false;
    });

    it('multiple duplicates return true', () => {
      const uniqueArray = ['a', 'b', 'c'];
      const dupesArr = [];
      dupesArr.push(...uniqueArray);
      dupesArr.push(...uniqueArray);
      dupesArr.push(...uniqueArray);
      expect(dupesArr.length).to.equal(9);
      expect(common.checkDuplicatesInStringArray(dupesArr)).to.be.true;
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
});
