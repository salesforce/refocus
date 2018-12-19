/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/postWithCollector.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const path = '/v1/generators';
const GeneratorTemplate = tu.db.GeneratorTemplate;
const expect = require('chai').expect;
const sinon = require('sinon');
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;

describe('tests/api/v1/generators/postWithCollector.js >', () => {
  let token;
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
    .then(() => tu.db.CollectorGroup.create(collectorGroup1))
    .then((cg) => {
      collectorGroup1 = cg;
      return cg.addCollector(collector1);
    })
    .then(u.createGeneratorAspects())
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  it('simple post returns collectors field', (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    localGenerator.possibleCollectors = [
      collector1.name,
      collector2.name,
      collector3.name,
    ];
    localGenerator.collectorGroup = collectorGroup1.name;
    api.post(path)
    .set('Authorization', token)
    .send(localGenerator)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.possibleCollectors.length).to.equal(THREE);
      const collectorNames = res.body.possibleCollectors.map((collector) =>
        collector.name);
      expect(collectorNames).to.deep.equal(sortedNames);

      const { collectorGroup } = res.body;
      expect(collectorGroup.name).to.equal(collectorGroup1.name);
      expect(collectorGroup.description).to.equal(collectorGroup1.description);
      expect(collectorGroup.collectors.length).to.equal(ONE);
      expect(collectorGroup.collectors[0].name).to.equal(collector1.name);
      expect(collectorGroup.collectors[0].status).to.equal(collector1.status);
      return done();
    });
  });

  it('GETing a generator after posting should have its collector ' +
    'array sorted', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    _generator.name = 'generatorForPosting';
    _generator.possibleCollectors = [
      collector1.name,
      collector2.name,
      collector3.name,
    ];
    api.post(path)
    .set('Authorization', token)
    .send(_generator)
    .expect(constants.httpStatus.CREATED)
    .then(() => {
      api.get(`${path}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.lengthOf(TWO);
        const firstGenerator = res.body[ZERO];
        expect(firstGenerator.possibleCollectors.length).to.equal(THREE);
        let collectorNames = firstGenerator.possibleCollectors.map((collector) =>
          collector.name);
        expect(collectorNames).to.deep.equal(sortedNames);
        expect(firstGenerator.id).to.not.equal(undefined);
        const secondGenerator = res.body[ONE];
        expect(secondGenerator.possibleCollectors.length).to.equal(THREE);

        collectorNames = secondGenerator.possibleCollectors.map((collector) =>
          collector.name);
        expect(collectorNames).to.deep.equal(sortedNames);
        expect(secondGenerator.id).to.not.equal(undefined);
        return done();
      });
    });
  });

  it('404 error for request body with an non-existant collector',
    (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    localGenerator.possibleCollectors = ['iDontExist'];
    api.post(path)
    .set('Authorization', token)
    .send(localGenerator)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('ResourceNotFoundError');
      expect(res.body.errors[0].source).to.equal('Generator');
      return done();
    });
  });

  it('404 error for request body with an existing and a non-existant collector',
    (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    localGenerator.possibleCollectors = [collector1.name, 'iDontExist'];
    api.post(path)
    .set('Authorization', token)
    .send(localGenerator)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('ResourceNotFoundError');
      expect(res.body.errors[0].source).to.equal('Generator');
      return done();
    });
  });

  describe('alive and running collector available >', () => {
    let clock;
    const now = Date.now();
    const collector4 = {
      name: 'IamAliveAndRunning',
      version: '1.0.0',
      status: 'Running',
      lastHeartbeat: now,
    };

    before(() => {
      clock = sinon.useFakeTimers(now);
    });

    before((done) => {
      tu.db.Generator.destroy({ where: { name: generator.name }, force: true })

      // creates alive and running collector
      .then(() => tu.db.Collector.create(collector4))
      .then(() => done())
      .catch(done);
    });

    after(() => clock.restore());

    it('posting generator should set currentCollector', (done) => {
      const localGenerator = JSON.parse(JSON.stringify(generator));
      localGenerator.possibleCollectors = [
        collector1.name, // not alive
        collector4.name, // alive
      ];
      localGenerator.isActive = true; // will make localGenerator active
      api.post(path)
      .set('Authorization', token)
      .send(localGenerator)
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.possibleCollectors.length).to.equal(TWO);
        expect(res.body.currentCollector.name).to.equal('IamAliveAndRunning');
        return done();
      });
    });
  });
});
