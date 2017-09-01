/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/createWithCollectors.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;

describe('tests/db/model/generator/create.js >', () => {
  const generator = JSON.parse(JSON.stringify(u.getGenerator()));
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  let userInst;
  beforeEach((done) => {
    tu.createUser('GeneratorOwner')
    .then((user) => {
      userInst = user;
      generator.createdBy = user.id;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);
  afterEach(gtUtil.forceDelete);

  it('ok, create with one collectors field', (done) => {
    let collector;
    tu.db.Collector.create({ name: 'snow' })
    .then((_collector) => {
      collector = _collector;
      return Generator.create(generator)
    })
    .then((gen) => gen.addCollectors([collector]))
    .then((generatorCollectorEntry) => Generator
      .findOne({ where: { name: generator.name }}))
    .then((findresult) => findresult.reload())
    .then((result) => {
      expect(result.collectors.length).to.equal(1);
      done();
    })
    .catch(done);
  });

  it('get collector returns one collector', (done) => {
    let collector = { name: 'snow' };
    tu.db.Collector.create(collector)
    .then((_collector) => {
      collector = _collector;
      return Generator.create(generator)
    })
    .then((gen) => gen.addCollectors([collector]))
    .then((generatorCollectorEntry) => Generator
      .findOne({ where: { name: generator.name }}))
    .then((findresult) => findresult.getCollectors())
    .then((collectors) => {
      expect(collectors.length).to.equal(1);
      expect(collectors[0].name).to.equal(collector.name);
      done();
    })
    .catch(done);
  });

  it('get collectors returns two collectors in the same order they were created',
    (done) => {
    let collector1 = { name: 'hello' };
    let collector2 = { name: 'world' };
    Promise.all([
      tu.db.Collector.create(collector1),
      tu.db.Collector.create(collector2),
    ])
    .then((collectors) => {
      collector1 = collectors[0];
      collector2 = collectors[1];
      return Generator.create(generator);
    })
    .then((gen) => gen.addCollectors([collector1, collector2]))
    .then((generatorCollectorEntry) => Generator
      .findOne({ where: { name: generator.name }}))
    .then((findresult) => findresult.getCollectors())
    .then((collectors) => {
      expect(collectors.length).to.equal(2);
      expect(collectors[0].name).to.equal(collector1.name);
      expect(collectors[1].name).to.equal(collector2.name);
      done();
    })
    .catch(done);
  });
});

