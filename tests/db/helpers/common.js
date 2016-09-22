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

describe('utility function tests:', () => {
  after(u.forceDelete);
  describe('publishChange function:', () => {
    it('create a model', (done) => {
      const par = { name: `${tu.namePrefix}Alpha`, isPublished: true };
      Subject.create(par)
      .then((o) => {
        const obj = common.publishChange(o, 'add');
        expect(obj).to.have.property('add');
        done();
      })
      .catch((err) => done(err));
    });

    it('destory with a model', (done) => {
      const par = { name: `${tu.namePrefix}Gamma`, isPublished: true };
      Subject.create(par)
      .then((o) => {
        return o.destroy();
      })
      .then((o) => {
        const obj = common.publishChange(o, 'delete');
        expect(obj).to.have.property('delete');
        done();
      })
      .catch((err) => done(err));
    });

    it('update a model instance', (done) => {
      const par = { name: `${tu.namePrefix}Kappa`, isPublished: false };
      Subject.create(par)
      .then((o) => {
        return o.update({ isPublished: true });
      })
      .then((o) => {
        const changedKeys = Object.keys(o._changed);
        const ignoreAttributes = ['isDeleted'];
        const obj = common.publishChange(o, 'update', changedKeys,
          ignoreAttributes);
        expect(obj.update).to.have.property('new');
        done();
      })
      .catch((err) => done(err));
    });

    it('update a fields in a model that' +
        ' is a part of ignoreAttributes ', (done) => {
      const par = { name: `${tu.namePrefix}Delta`, isPublished: false };
      Subject.create(par)
      .then((o) => {
        return o.update({ isPublished: true });
      })
      .then((o) => {
        const changedKeys = Object.keys(o._changed);
        const ignoreAttributes = changedKeys;
        const obj = common.publishChange(o, 'update', changedKeys,
          ignoreAttributes);
        expect(obj.update).to.equal(null);
        done();
      })
      .catch((err) => done(err));
    });

    it('update a model instance field with the same filed'+
      'in ignoreAttributes', (done) => {
      const par = { name: `${tu.namePrefix}Eta`, isPublished: false };
      Subject.create(par)
      .then((o) => {
        return o.update({ isPublished: true });
      })
      .then((o) => {
        const changedKeys = Object.keys(o._changed);
        const ignoreAttributes = changedKeys;
        const obj = common.publishChange(o, 'update', changedKeys,
          ignoreAttributes);
        expect(obj.update).to.equal(null);
        done();
      })
      .catch((err) => done(err));
    });
  });
  describe('sampleAspectAndSubjectArePublished function:', () => {
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
      .catch((err) => done(err));
    });

    it('create sample; check for true', (done) => {
      Sample.upsertByName({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect`,
        value: '1',
      })
      .then((samp) => {
        return common.sampleAspectAndSubjectArePublished(tu.db.sequelize, samp);
      })
      .then((pub) => {
        expect(pub).to.equal(true);
      })
      .then(() => done())
      .catch((err) => done(err));
    });

    it('create sample; check for false', (done) => {
      Subject.findById(sub.id)
      .then((s) => s.update({ isPublished: false }))
      .then(() => Sample.upsertByName({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect`,
        value: '1',
      }))
      .then((samp) => {
        return common.sampleAspectAndSubjectArePublished(tu.db.sequelize, samp);
      })
      .then((pub) => {
        expect(pub).to.equal(false);
      })
      .then(() => done())
      .catch((err) => done(err));
    });
  });
});
