/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/patchWithCollectors.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Collector = tu.db.Collector;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;
const NOT_FOUND_STATUS_CODE = 404;

describe('tests/db/model/generator/patchWithCollectors.js >', () => {
  let collector1 = { name: 'hello' };
  let collector2 = { name: 'beautiful' };
  let collector3 = { name: 'world' };
  let userInst;
  const generator = JSON.parse(JSON.stringify(u.getGenerator()));
  const generatorTemplate = gtUtil.getGeneratorTemplate();

  before((done) => {
    tu.createUser('GeneratorOwner')
    .then((user) => {
      generator.createdBy = user.id;
      userInst = user;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => Promise.all([
      Collector.create(collector1),
      Collector.create(collector2),
      Collector.create(collector3),
    ]))
    .then((collectors) => {
      collector1 = collectors[ZERO];
      collector2 = collectors[ONE];
      collector3 = collectors[TWO];
      done();
    })
    .catch(done);
  });

  // delete generator after each test
  afterEach(() => tu.forceDelete(tu.db.Generator, new Date()));
  afterEach(u.forceDelete);
  after(gtUtil.forceDelete);

  it.only('adds the expected generators, to a generator with no collectors', (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    Generator.createWithCollectors(localGenerator)
    .then((o) => {
      return Generator.patchWithCollectors({ colletors: [collector1.name] })
    })
    .then((o) => {
      console.log(o.collectors)
      expect(o.collectors.length).to.equal(ONE);
      expect(o.collectors[ZERO].name).to.equal(collector1.name);
      done();
    })
    .catch(done);
  });

  it('adds the expected generators, to a generator with collectors (no overlap)');

  it('adds the expected generators, to a generator with collectors (overlap)');

  it('entirely overlapping colletors. No collectors added');

  it('404 error for request body with an non-existant collector');

  it('404 error for request body with an existing and a ' +
    'non-existant collector')

});
