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
const api = supertest(require('../../../../index').app);
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
    .then(() => done())
    .catch(done);
  });

  beforeEach((done) => {
    Generator.create(generator)
    .then((gen) => {
      generatorId = gen.id;
      generatorInst = gen;
      return gen.addPossibleCollectors([collector1]);
    })
    .then(() => done())
    .catch(done);
  });

  // delete generator after each test
  afterEach(() => tu.forceDelete(tu.db.Generator, testStartTime));
  after(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  it('ok: PATCH to a collector that is already attached to the generator', (done) => {
    const _name = 'hello';
    api.patch(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send({ name: _name })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { name, possibleCollectors } = res.body;
      expect(name).to.equal(_name);
      expect(possibleCollectors.length).to.equal(ONE);
      expect(possibleCollectors[ZERO].name).to.equal(collector1.name);
      done();
    });
  });

  it('ok: PATCH to add new collectors', (done) => {
    api.patch(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send({ possibleCollectors: [collector2.name, collector3.name] })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { possibleCollectors } = res.body;
      expect(Array.isArray(possibleCollectors)).to.be.true;
      expect(possibleCollectors.length).to.equal(THREE);
      const collectorNames = possibleCollectors.map((collector) => collector.name);
      expect(collectorNames).to.deep.equal(sortedNames);
      done();
    });
  });

  it('ok: PATCH to a collector that is already attached to the generator', (done) => {
    api.patch(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send({ possibleCollectors: [collector1.name] })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { possibleCollectors } = res.body;
      expect(possibleCollectors.length).to.equal(ONE);
      expect(possibleCollectors[ZERO].name).to.equal(collector1.name);
      done();
    });
  });

  it('400 error with duplicate collectors in request body', (done) => {
    const _collectors = [collector1.name, collector1.name];
    api.patch(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send({ possibleCollectors: _collectors })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('DuplicateCollectorError');
      expect(res.body.errors[0].source).to.equal('Generator');
      done();
    });
  });

  it('404 error for request body with an existing and a ' +
    'non-existant collector', (done) => {
    const _collectors = [collector1.name, 'iDontExist'];
    api.patch(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send({ possibleCollectors: _collectors })
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('ResourceNotFoundError');
      expect(res.body.errors[0].source).to.equal('Generator');
      done();
    });
  });

  describe('assign to collector >', () => {
    // generator already created with collector1 as possible collector
    let clock;
    const now = Date.now();
    let collectorAlive1 = {
      name: 'IamAliveAndRunning1',
      version: '1.0.0',
      status: 'Running',
      lastHeartbeat: now,
    };

    let collectorAlive2 = {
      name: 'IamAliveAndRunning2',
      version: '1.0.0',
      status: 'Running',
      lastHeartbeat: now,
    };

    beforeEach(() => {
      clock = sinon.useFakeTimers(now);
    });

    before((done) => { // create alive collectors
      tu.db.Collector.bulkCreate([collectorAlive1, collectorAlive2])
      .then((collectors) => {
        collectorAlive1 = collectors[0];
        collectorAlive2 = collectors[1];
        return done();
      })
      .catch(done);
    });

    afterEach(() => clock.restore());

    it('unassigned generator with no possible collectors, patch generator ' +
      'with possible collectors should set currentCollector if an alive' +
      'collector is included', (done) => {
      expect(generatorInst.currentCollector).to.be.equal(null);
      generatorInst.setPossibleCollectors([])
      .then(() => generatorInst.reload())
      .then(() => {
        expect(generatorInst.possibleCollectors).to.be.empty;
        const requestBody = {};
        requestBody.possibleCollectors = [collector1.name, collectorAlive1.name];
        requestBody.isActive = true;
        api.patch(`${path}/${generatorId}`)
        .set('Authorization', token)
        .send(requestBody)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const collectors = res.body.possibleCollectors;
          expect(Array.isArray(collectors)).to.be.true;
          expect(collectors.length).to.equal(TWO);
          const collectorNames = collectors.map((collector) => collector.name);
          expect(collectorNames).to.deep.equal(
            ['hello', 'IamAliveAndRunning1']
          );
          expect(res.body.currentCollector.name).to.equal('IamAliveAndRunning1');
          return done();
        });
      })
      .catch(done);
    });

    it('unassigned generator, patch generator with more possible collectors ' +
      'should set currentCollector if alive collector is included', (done) => {
      expect(generatorInst.currentCollector).to.be.equal(null);
      const requestBody = {};
      requestBody.possibleCollectors = [collector1.name, collectorAlive1.name];
      requestBody.isActive = true;
      api.patch(`${path}/${generatorId}`)
      .set('Authorization', token)
      .send(requestBody)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const collectors = res.body.possibleCollectors;
        expect(Array.isArray(collectors)).to.be.true;
        expect(collectors.length).to.equal(TWO);
        const collectorNames = collectors.map((collector) => collector.name);
        expect(collectorNames).to.deep.equal(['hello', 'IamAliveAndRunning1']);
        expect(res.body.currentCollector.name).to.equal('IamAliveAndRunning1');
        return done();
      });
    });

    it('assigned generator, patch generator with more possible collectors ' +
      'should not change currentCollector even if alive collector is added',
    (done) => {
      expect(generatorInst.currentCollector).to.be.equal(null);

      // set possibleCollectors to collectorAlive1
      generatorInst.setPossibleCollectors([collectorAlive1])
      .then(() => generatorInst.reload())

      // make generator active
      .then(() => generatorInst.update({ isActive: true }))
      .then((gen) => {
        expect(gen.currentCollector.name).to.be.equal(collectorAlive1.name);

        // set possible collectors = collector1, collectorAlive2
        const requestBody = {};
        requestBody.possibleCollectors =
        [collector1.name, collectorAlive2.name];
        requestBody.isActive = true;

        api.patch(`${path}/${generatorId}`)
        .set('Authorization', token)
        .send(requestBody)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const collectors = res.body.possibleCollectors;
          expect(Array.isArray(collectors)).to.be.true;
          expect(collectors.length).to.equal(THREE);
          const collectorNames = collectors.map((collector) => collector.name);
          expect(collectorNames).to.deep.equal(
            ['hello', 'IamAliveAndRunning1', 'IamAliveAndRunning2']
          );
          expect(res.body.currentCollector.name).to.equal('IamAliveAndRunning1');
          return done();
        });
      }).catch(done);
    });
  });
});
