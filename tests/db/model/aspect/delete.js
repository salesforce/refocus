/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/aspect/delete.js
 */
'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

describe('db: aspect: delete: ', () => {
  beforeEach((done) => {
    u.createMedium()
    .then(() => done())
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);

  it('simple', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => o.destroy())
    .then((o) => {
      if (o.deletedAt && o.isDeleted) {
        done();
      } else {
        done(new Error('expecting it to be soft-deleted'));
      }
    })
    .catch((err) => done(err));
  });

  it('with tags', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => {
      o.tags = ['xxxxx'];
      return o.save();
    })
    .then(() => Aspect.findOne({ where: { name: u.name } }))
    .then((o) => o.destroy())
    .then((o) => {
      if (o.deletedAt && o.isDeleted) {
        // console.log(o.dataValues.Tags);
        done();
      } else {
        done(new Error('expecting it to be soft-deleted'));
      }
    })
    .catch((err) => done(err));
  });

  it('with relatedLinks', (done) => {
    Aspect.findOne({ where: { name: u.name } })
    .then((o) => {
      o.relatedLinks = [{ name: 'destroyRelatedLink',
      url: 'https://fakelink.com' }];
      return o.save();
    })
    .then(() => Aspect.findOne({ where: { name: u.name } }))
    .then((o) => o.destroy())
    .then((o) => {
      if (o.deletedAt && o.isDeleted) {
        expect(o.dataValues.relatedLinks[0]).to.have.property('name')
        .to.equal('destroyRelatedLink');
        expect(o.dataValues.relatedLinks[0]).to.have.property('url')
        .to.equal('https://fakelink.com');
        expect(o.dataValues).to.have.property('isDeleted').to.not.equal(0);
        expect(o.dataValues).to.have.property('deletedAt').to.not.equal(null);
        // console.log(o.dataValues);
        done();
      } else {
        // console.log(o.dataValues);
        done(new Error('expecting it to be soft-deleted'));
      }
    })
    .catch((err) => done(err));
  });
});

describe('db: aspect: sample: ', () => {
  afterEach(u.forceDelete);
  let id = 0;
  beforeEach((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect`,
      timeout: '30s',
      valueType: 'NUMERIC',
    })
    .then((created) => {
      id = created.id;
    })
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
    }))
    .then(() => done())
    .catch((err) => done(err));
  });

  it('with sample', (done) => {
    Sample.upsertByName({
      name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect`,
      value: '1',
    })
    .then((o) => {
      // console.log(o.dataValues.value);
      // console.log(o.dataValues);
      expect(o.dataValues).to.have.deep.property('value', '1');
    })
    .then(() => Aspect.findById(id))
    .then((o) => o.destroy())
    .then((o) => {
      if (o.deletedAt && o.isDeleted) {
        // console.log(o.dataValues);
        expect(o.dataValues).to.have.property('isDeleted').to.not.equal(0);
        expect(o.dataValues).to.have.property('deletedAt').to.not.equal(null);
        done();
      } else {
        // console.log(o.dataValues);
        done(new Error('expecting it to be soft-deleted'));
      }
    })
    .catch((err) => done(err));
  });
});

