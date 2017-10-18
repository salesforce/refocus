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

  const generatorTemplate = gtUtil.getGeneratorTemplate();

  const genWithNoCollector = u.getGenerator();
  u.createSGtoSGTMapping(generatorTemplate, genWithNoCollector);
  const genWithOneCollector = u.getGenerator();
  genWithOneCollector.name = 'refocus-info-generator';
  u.createSGtoSGTMapping(generatorTemplate, genWithOneCollector);
  const genWithThreeCollectors = u.getGenerator();
  genWithThreeCollectors.name = 'refocus-critical-generator';
  u.createSGtoSGTMapping(generatorTemplate, genWithThreeCollectors);

  let collector1 = { name: 'hello', version: '1.0.0' };
  let collector2 = { name: 'beautiful', version: '1.0.0' };
  let collector3 = { name: 'world', version: '1.0.0' };
  const sortedNames = [collector1, collector2, collector3]
    .map((col) => col.name)
    .sort();

  before((done) => {
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
    .then(() => tu.createToken())
    .then((returnedToken) => {
      token = returnedToken;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => Generator.create(genWithNoCollector))
    .then((gen) => {
      genWithNoCollector.id = gen.id;
      return Generator.create(genWithOneCollector);
    })
    .then((gen) => {
      genWithOneCollector.id = gen.id;
      return gen.addCollectors([collector1]);
    })
    .then(() => Generator.create(genWithThreeCollectors))
    .then((gen) => {
      genWithThreeCollectors.id = gen.id;
      return gen.addCollectors([collector1, collector2, collector3]);
    })
    .then(() => done())
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
      expect(res.body).to.have.lengthOf(THREE);
      expect(firstGenerator.collectors.length).to.equal(THREE);

      const collectorNames = firstGenerator.collectors.map((collector) =>
        collector.name);
      expect(collectorNames).to.deep.equal(sortedNames);
      expect(firstGenerator.id).to.not.equal(undefined);
      expect(res.body[ONE].collectors.length).to.equal(ONE);
      expect(res.body[ONE].collectors[ZERO].name).to.equal(collector1.name);
      expect(res.body[ONE].id).to.not.equal(undefined);
      expect(res.body[TWO].collectors.length).to.equal(ZERO);
      expect(res.body[TWO].id).to.not.equal(undefined);
      return done();
    });
  });

  it('get individual generator yields non-empty collectors field', (done) => {
    api.get(`${path}/${genWithThreeCollectors.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.collectors.length).to.equal(THREE);
      const collectorNames = res.body.collectors.map((collector) =>
        collector.name);
      expect(collectorNames).to.deep.equal(sortedNames);
      return done();
    });
  });
});
