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
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const ZERO = 0;
const ONE = 1;
const TWO = 2;

describe('tests/db/model/generator/withCollectors.js >', () => {
  let createdGenerator;
  const generator = JSON.parse(JSON.stringify(u.getGenerator()));
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  let userInst;
  before((done) => {
    tu.createUser('GeneratorOwner')
    .then((user) => {
      userInst = user;
      generator.createdBy = user.id;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => Generator.create(generator))
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
        return createdGenerator.addCollectors([collector]);
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
      expect(relodedGenerator.collectors.length).to.equal(ONE);
    });

    it('get collector returns one collector', (done) => {
      relodedGenerator.getCollectors()
      .then((collectors) => {
        expect(collectors.length).to.equal(ONE);
        expect(collectors[ZERO].name).to.equal(collector.name);
        done();
      })
      .catch(done);
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
        return createdGenerator.addCollectors([collector1, collector2]);
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
      expect(relodedGenerator.collectors.length).to.equal(TWO);
    });

    it('get collector returns two collector', (done) => {
      relodedGenerator.getCollectors()
      .then((collectors) => {
        expect(collectors.length).to.equal(TWO);
        expect(collectors[ZERO].name).to.equal(collector1.name);
        expect(collectors[ONE].name).to.equal(collector2.name);
        done();
      })
      .catch(done);
    });
  });
});

