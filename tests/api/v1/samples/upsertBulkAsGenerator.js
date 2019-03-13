/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/upsertBulkAsGenerator.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const tu = require('../../../testUtils');
const u = require('../collectors/utils');
const Collector = tu.db.Collector;
const expect = require('chai').expect;
const Generator = tu.db.Generator;
const CollectorGroup = tu.db.CollectorGroup;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const sgUtils = require('../generators/utils');
const gtUtil = sgUtils.gtUtil;
const constants = require('../../../../api/v1/constants');

describe('tests/api/v1/samples/upsertBulkAsGenerator.js >', () => {
  let token;
  let user;
  const defaultCollector = u.getCollectorToCreate();
  defaultCollector.version = '0.0.1';

  let generatorWithCollector;
  let generatorWithoutCollector;
  let collector;
  let collectorGroup1;
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  let cg1 = { name: `${tu.namePrefix}-cg1`, description: 'test' };

  before((done) => {
    tu.createUserAndToken()
      .then((createdUser) => {
        user = createdUser.user;
        token = createdUser.token;
        return done();
      })
      .catch(done);
  });

  beforeEach((done) => {
    sgUtils.createGeneratorAspects()
      .then(() => CollectorGroup.create(cg1))
      .then((cg) => collectorGroup1 = cg)
      .then(() => GeneratorTemplate.create(generatorTemplate))
      .then(() => Collector.create(u.getCollectorToCreate()))
      .then((collectorCreated) => {
        collector = collectorCreated;
        return collectorGroup1.setCollectors([collector]);
      })
      .then(() => {
        const generator1 = sgUtils.getGenerator();
        generator1.name += '-generator-1';
        generator1.createdBy = user.id;
        generator1.collectorId = collector.id;
        generator1.collectorGroup = collectorGroup1.name;

        // Create template to the Generator
        sgUtils.createSGtoSGTMapping(generatorTemplate, generator1);

        const generator2 = sgUtils.getGenerator();
        generator2.name += '-generator-2';
        generator2.createdBy = user.id;
        generator2.collectorGroup = collectorGroup1.name;

        return Generator.bulkCreate([generator1, generator2]);
      })
      .then((generators) => {
        generatorWithCollector = generators[0];
        generatorWithoutCollector = generators[1];
      })
      .then(() => done())
      .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('with generator and collector running >', () => {
    // Starts the collector
    beforeEach((done) => {
      api.post('/v1/collectors/start')
        .set('Authorization', token)
        .send(defaultCollector)
        .expect(constants.httpStatus.OK)
        .then((res) => {
          expect(res.body.status).to.equal('Running');
          return done();
        }).catch(done);
    });

    it('must be able to send sample properly', (done) => {
      const tokenGen = tu.createGeneratorToken(
        generatorWithCollector.name,
        { IsGenerator: true }
      );

      api.post('/v1/samples/upsert/bulk')
        .set('Authorization', tokenGen)
        .send([{ name: '_Subject|_Aspect1', value: '2', }])
        .expect(constants.httpStatus.OK)
        .then(() => done())
        .catch(done);
    });
  });

  describe('With a valid generator and current collector with status' +
    ' different of Running >', () => {
    it('must return a forbidden access with invalid status', (done) => {
      const tokenGen = tu.createGeneratorToken(
        generatorWithCollector.name,
        { IsGenerator: true }
      );

      api.post('/v1/samples/upsert/bulk')
        .set('Authorization', tokenGen)
        .send([{ name: '_Subject|_Aspect1', value: '2', }])
        .end((err, res) => {
          expect(res.status).to.equal(constants.httpStatus.FORBIDDEN);

          const expectedMsg = 'Cannot accept samples from Collector' +
            ' ___Coll with status "Stopped"';
          expect(res.body.errors[0].description).to.equal(expectedMsg);
          return done();
        });
    });
  });

  describe('With a valid generator and no current collector >', () => {
    it('must return a forbidden and invalid collector', (done) => {
      const tokenGen = tu.createGeneratorToken(
        generatorWithoutCollector.name,
        { IsGenerator: true }
      );

      api.post('/v1/samples/upsert/bulk')
        .set('Authorization', tokenGen)
        .send([{ name: '_Subject|_Aspect1', value: '2', }])
        .end((err, res) => {
          expect(res.status).to.equal(constants.httpStatus.FORBIDDEN);

          const expectedMsg = 'Cannot accept Generator ' +
            'refocus-ok-generator-generator-2 samples without current' +
            ' collector';
          expect(res.body.errors[0].description).to.equal(expectedMsg);
          return done();
        });
    });
  });

  describe('Given a non Generator >', () => {
    it('must be able to send sample', (done) => {
      api.post('/v1/samples/upsert/bulk')
        .set('Authorization', token)
        .send([{ name: '_Subject|_Aspect1', value: '2', }])
        .expect(constants.httpStatus.OK)
        .then(() => done())
        .catch(done);
    });
  });
});
