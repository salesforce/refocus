/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/patchWithCollector.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const sinon = require('sinon');
const gtUtil = u.gtUtil;
const path = '/v1/generators';
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;
const testStartTime = new Date();

describe('tests/api/v1/generators/patchWithCollector.js >', () => {
  let token;
  let generatorId;
  let generatorInst;
  let collector1 = { name: 'hello', version: '1.0.0' };
  let collector2 = { name: 'beautiful', version: '1.0.0' };
  let collector3 = { name: 'world', version: '1.0.0' };
  const sortedNames = [collector1, collector2, collector3]
  .map((col) => col.name)
  .sort();
  const generator = u.getGenerator();
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  u.createSGtoSGTMapping(generatorTemplate, generator);
  let collectorGroup1 = { name: `${tu.namePrefix}-cg1`, description: 'test' };
  let collectorGroup2 = { name: `${tu.namePrefix}-cg2`, description: 'test' };
  collectorGroup1.collectors = [collector1.name];
  collectorGroup2.collectors = [collector2.name];
  generator.collectorGroup = collectorGroup1.name;

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
      return tu.createToken();
    })
    .then((returnedToken) => {
      token = returnedToken;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => tu.db.CollectorGroup.createCollectorGroup(collectorGroup1))
    .then(() => tu.db.CollectorGroup.createCollectorGroup(collectorGroup2))
    .then(() => done())
    .catch(done);
  });

  beforeEach((done) => {
    Generator.createWithCollectors(generator)
    .then((gen) => {
      generatorId = gen.id;
      generatorInst = gen;
      done();
    })
    .catch(done);
  });

  // delete generator after each test
  afterEach(() => tu.forceDelete(tu.db.Generator, testStartTime));
  after(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  it('ok: empty patch doesnt replace collector group', (done) => {
    api.patch(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send({ description: '...' })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { collectorGroup } = res.body;
      expect(collectorGroup.name).to.equal(collectorGroup1.name);
      expect(collectorGroup.description).to.equal(collectorGroup1.description);
      expect(collectorGroup.collectors.length).to.equal(ONE);
      expect(collectorGroup.collectors[0].name).to.equal(collector1.name);
      expect(collectorGroup.collectors[0].status).to.equal(collector1.status);
      done();
    });
  });

  it('ok: PATCH collectorGroup', (done) => {
    api.patch(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send({ collectorGroup: collectorGroup2.name })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { collectorGroup } = res.body;
      expect(collectorGroup.name).to.equal(collectorGroup2.name);
      expect(collectorGroup.description).to.equal(collectorGroup2.description);
      expect(collectorGroup.collectors.length).to.equal(ONE);
      expect(collectorGroup.collectors[0].name).to.equal(collector2.name);
      expect(collectorGroup.collectors[0].status).to.equal(collector2.status);
      done();
    });
  });

  it('error: nonexistent collector group', (done) => {
    api.patch(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send({ collectorGroup: 'aaa' })
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].message).to.equal('CollectorGroup "aaa" not found.');
      done();
    });
  });

});
