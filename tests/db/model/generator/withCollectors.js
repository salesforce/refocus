/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/withCollectors.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const CollectorGroup = tu.db.CollectorGroup;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const ZERO = 0;
const ONE = 1;
const TWO = 2;

describe('tests/db/model/generator/withCollectors.js >', () => {
  let createdGenerator;
  let collectorGroup1 = { name: `${tu.namePrefix}-cg1`, description: 'test' };
  const generator = JSON.parse(JSON.stringify(u.getGenerator()));
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  generator.collectorGroup = collectorGroup1.name;
  let userInst;
  before((done) => {
    tu.createUser('GeneratorOwner')
    .then((user) => {
      userInst = user;
      generator.createdBy = user.id;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => CollectorGroup.create(collectorGroup1))
    .then(() => Generator.createWithCollectors(generator))
    .then((_createdGenerator) => {
      createdGenerator = _createdGenerator;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(gtUtil.forceDelete);

  describe('with one collector', () => {
    let collector;
    let relodedGenerator;

    before((done) => {
      tu.db.Collector.create({ name: 'snow', version: '1.0.0' })
      .then((_collector) => {
        collector = _collector;
        return createdGenerator.collectorGroup.addCollectors([collector]);
      })
      .then(() => Generator
        .findOne({ where: { name: generator.name } }))
      .then((findresult) => findresult.reload())
      .then((_generator) => {
        relodedGenerator = _generator;
        done();
      })
      .catch(done);
    });

    after(u.forceDeleteCollector);

    it('ok, create with a user field', () => {
      expect(relodedGenerator.user.name).to.equal(userInst.name);
    });

    it('ok, create with one collectors field', () => {
      expect(relodedGenerator.collectorGroup.collectors.length).to.equal(ONE);
      expect(relodedGenerator.collectorGroup.collectors[ZERO].name).to.equal(collector.name);
    });
  });

  describe('with two collectors', () => {
    let collector1 = { name: 'hello', version: '1.0.0' };
    let collector2 = { name: 'world', version: '1.0.0' };
    let relodedGenerator;

    before((done) => {
      Promise.all([
        tu.db.Collector.create(collector1),
        tu.db.Collector.create(collector2),
      ])
      .then((collectors) => {
        collector1 = collectors[ZERO];
        collector2 = collectors[ONE];
        return createdGenerator.collectorGroup.addCollectors([collector1, collector2]);
      })
      .then(() => Generator
        .findOne({ where: { name: generator.name } }))
      .then((findresult) => findresult.reload())
      .then((_generator) => {
        relodedGenerator = _generator;
        done();
      })
      .catch(done);
    });

    after(u.forceDeleteCollector);

    it('ok, create with two collectors field', () => {
      expect(relodedGenerator.collectorGroup.collectors.length).to.equal(TWO);
    });
  });
});

