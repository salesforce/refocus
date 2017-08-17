/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/aspect/tags.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const Sample = tu.db.Sample;

describe('tests/db/model/aspect/tags.js, update >', () => {
  beforeEach((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}A`,
      timeout: '1s',
      valueType: 'NUMERIC',
      criticalRange: [0, 0],
      warningRange: [1, 1],
      infoRange: [2, 2],
      okRange: [3, 3],
      tags: ['T1'],
    })
    .then(() => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}B`,
      timeout: '2m',
      valueType: 'NUMERIC',
      criticalRange: [0, 0],
      warningRange: [1, 1],
      infoRange: [2, 2],
      okRange: [3, 3],
      tags: ['T2'],
    }))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
    }))
    .then(() => Sample.bulkUpsertByName([
      { name: `${tu.namePrefix}Subject|${tu.namePrefix}A`, value: 1 },
      { name: `${tu.namePrefix}Subject|${tu.namePrefix}B`, value: 2 },
    ]))
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('update an aspect tag, samples have it next time they are loaded',
  (done) => {
    Aspect.findOne({ name: `${tu.namePrefix}A` })
    .then((o) => {
      o.tags = ['T3'];
      return o.save();
    })
    .then(() => Sample.findOne({
      name: `${tu.namePrefix}Subject|${tu.namePrefix}A`,
    }))
    .then((s) => {
      expect(s.dataValues.aspect.tags).to.deep.equal(['T3']);
      done();
    })
    .catch(done);
  });
});
