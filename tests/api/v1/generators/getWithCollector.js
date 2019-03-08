/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/getWithCollector.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const path = '/v1/generators';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;

describe('tests/api/v1/generators/getWithCollector.js >', () => {
  let token;
  let collector1 = { name: 'hello', version: '1.0.0' };
  let collector2 = { name: 'beautiful', version: '1.0.0' };
  let collector3 = { name: 'world', version: '1.0.0' };
  let collectorGroup1 = { name: `${tu.namePrefix}-cg1`, description: 'test' };
  let collectorGroup2 = { name: `${tu.namePrefix}-cg2`, description: 'test' };
  collectorGroup1.collectors = [collector1.name];
  collectorGroup2.collectors = [collector2.name, collector3.name];

  const generatorTemplate = gtUtil.getGeneratorTemplate();

  const genWithNoCollector = u.getGenerator();
  u.createSGtoSGTMapping(generatorTemplate, genWithNoCollector);

  const genWithOneCollector = u.getGenerator();
  genWithOneCollector.name = 'refocus-info-generator';
  u.createSGtoSGTMapping(generatorTemplate, genWithOneCollector);

  const genWithTwoCollectors = u.getGenerator();
  genWithTwoCollectors.name = 'refocus-critical-generator';
  u.createSGtoSGTMapping(generatorTemplate, genWithTwoCollectors);

  const sortedNames = [collector2, collector3]
    .map((col) => col.name)
    .sort();

  before((done) => {
    // make collector 1 alive so that currentCollector can be assigned when creating generators
    collector1.status = 'Running';
    collector1.lastHeartbeat = Date.now();
    Promise.all([
      tu.db.Collector.create(collector1),
      tu.db.Collector.create(collector2),
      tu.db.Collector.create(collector3),
    ])
    .then((collectors) => {
      collector1 = collectors[ZERO];
      collector2 = collectors[ONE];
      collector3 = collectors[TWO];
    })
    .then(() => tu.db.CollectorGroup.createCollectorGroup(collectorGroup1))
    .then(() => tu.db.CollectorGroup.createCollectorGroup(collectorGroup2))
    .then(() => tu.createToken())
    .then((returnedToken) => {
      token = returnedToken;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => Generator.create(genWithNoCollector))
    .then((gen) => {
      genWithNoCollector.id = gen.id;

      genWithOneCollector.isActive = true;
      genWithOneCollector.currentCollector = collector1.name;
      genWithOneCollector.collectorGroup = collectorGroup1.name;
      return Generator.createWithCollectors(genWithOneCollector);
    })
    .then((gen) => {
      genWithOneCollector.id = gen.id;
      genWithTwoCollectors.isActive = true;
      genWithTwoCollectors.currentCollector = collector1.name;
      genWithTwoCollectors.collectorGroup = collectorGroup2.name;
      return Generator.createWithCollectors(genWithTwoCollectors);
    })
    .then((gen) => {
      genWithTwoCollectors.id = gen.id;
      return done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  it('simple GET ALL returns the expected number of collectors ' +
    'per generator', (done) => {
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const firstGenerator = res.body[ZERO];
      const secondGenerator = res.body[ONE];
      const thirdGenerator = res.body[TWO];
      expect(res.body).to.have.lengthOf(THREE);
      expect(firstGenerator.collectorGroup.collectors.length).to.equal(TWO);

      const collectorNames = firstGenerator.collectorGroup.collectors
                              .map((collector) => collector.name);
      expect(collectorNames).to.have.members(sortedNames);
      expect(firstGenerator.id).to.not.equal(undefined);
      expect(secondGenerator.collectorGroup.name).to.equal(collectorGroup1.name);
      expect(secondGenerator.collectorGroup.description)
        .to.equal(collectorGroup1.description);
      expect(secondGenerator.collectorGroup.collectors.length).to.equal(ONE);
      expect(secondGenerator.collectorGroup.collectors[ZERO].name)
        .to.equal(collector1.name);
      expect(secondGenerator.collectorGroup.collectors[ZERO].status)
        .to.equal(collector1.status);
      expect(secondGenerator.id).to.not.equal(undefined);
      expect(thirdGenerator.collectorGroup).to.not.exist;
      expect(thirdGenerator.id).to.not.equal(undefined);

      return done();
    });
  });

  it('get individual generator yields non-empty collectors field', (done) => {
    api.get(`${path}/${genWithTwoCollectors.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.collectorGroup.collectors.length).to.equal(TWO);
      const collectorNames = res.body.collectorGroup.collectors
                              .map((collector) => collector.name);
      expect(collectorNames).to.have.members(sortedNames);
      return done();
    });
  });

  it('get individual generator yields non-empty collectorGroup field',
  (done) => {
    api.get(`${path}/${genWithOneCollector.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      // check collectorGroup
      expect(res.body.collectorGroup.name).to.equal(collectorGroup1.name);
      expect(res.body.collectorGroup.description)
      .to.equal(collectorGroup1.description);
      expect(res.body.collectorGroup.collectors.length).to.equal(ONE);
      expect(res.body.collectorGroup.collectors[0].name)
      .to.equal(collector1.name);
      expect(res.body.collectorGroup.collectors[0].status)
      .to.equal(collector1.status);
      return done();
    });
  });
});
