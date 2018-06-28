/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/putWithCollector.js
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

describe('tests/api/v1/generators/putWithCollector.js >', () => {
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
  const toPut = {
    name: 'refocus-ok-generator',
    description: 'Collect status data patched with name',
    tags: [
      'status',
      'STATUS',
    ],
    generatorTemplate: {
      name: generatorTemplate.name,
      version: generatorTemplate.version,
    },
    context: {
      okValue: {
        required: false,
        default: '0',
        description: 'An ok sample\'s value, e.g. \'0\'',
      },
    },
    subjects: ['US'],
    aspects: ['Temperature', 'Weather'],
  };

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
    .then(u.createGeneratorAspects())
    .then(() => done())
    .catch(done);
  });

  beforeEach((done) => {
    Generator.create(generator) // create generator
    .then((gen) => {
      generatorId = gen.id;
      generatorInst = gen;

      // add collector 1 to possible list of collectors of generator
      return generatorInst.addPossibleCollectors([collector1]);
    })
    .then(() => generatorInst.reload())
    .then(() => done())
    .catch(done);
  });

  afterEach(() => tu.forceDelete(tu.db.Generator, testStartTime));
  after(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  it('ok: wipes out collectors', (done) => {
    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { name, possibleCollectors } = res.body;
      expect(name).to.equal(toPut.name);
      expect(possibleCollectors.length).to.equal(ZERO);
      return done();
    });
  });

  it('ok: replace collector with more collectors', (done) => {
    const withCollectors = JSON.parse(JSON.stringify(toPut));
    withCollectors.possibleCollectors = [collector1.name, collector2.name, collector3.name];
    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(withCollectors)
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
      return done();
    });
  });

  it('ok: attach identical collector does alter collector', (done) => {
    const withCollectors = JSON.parse(JSON.stringify(toPut));
    withCollectors.possibleCollectors = [collector1.name];
    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(withCollectors)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { possibleCollectors } = res.body;
      expect(possibleCollectors.length).to.equal(ONE);
      expect(possibleCollectors[ZERO].name).to.equal(collector1.name);
      return done();
    });
  });

  it('400 error with duplicate collectors in request body', (done) => {
    const requestBody = JSON.parse(JSON.stringify(toPut));
    requestBody.possibleCollectors = [collector1.name, collector1.name];
    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(requestBody)
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
    const requestBody = JSON.parse(JSON.stringify(toPut));
    requestBody.possibleCollectors = [collector1.name, 'iDontExist'];
    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(requestBody)
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

    before((done) => { // create active generator
      tu.db.Collector.bulkCreate([collectorAlive1, collectorAlive2])
      .then((collectors) => {
        collectorAlive1 = collectors[0];
        collectorAlive2 = collectors[1];
        return done();
      })
      .catch(done);
    });

    afterEach(() => clock.restore());

    it('put generator should set currentCollector', (done) => {
      expect(generatorInst.currentCollector).to.be.equal(null);
      const requestBody = JSON.parse(JSON.stringify(toPut));
      requestBody.possibleCollectors = [collector1.name, collectorAlive1.name];
      requestBody.isActive = true;
      api.put(`${path}/${generatorId}`)
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
        expect(res.body.currentCollector).to.equal('IamAliveAndRunning1');
        return done();
      });
    });

    it('put generator, currentCollector exists in updated collector list',
    (done) => {
      generatorInst.update({ currentCollector: collectorAlive1.name })
      .then((updatedGenInst) => {
        expect(updatedGenInst.currentCollector).to.be.equal('IamAliveAndRunning1');
        const requestBody = JSON.parse(JSON.stringify(toPut));
        requestBody.possibleCollectors = [collector2.name, collectorAlive1.name];
        requestBody.isActive = true;
        api.put(`${path}/${generatorId}`)
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
          expect(collectorNames).to.deep.equal(['beautiful', 'IamAliveAndRunning1']);
          expect(res.body.currentCollector).to.equal('IamAliveAndRunning1');
          return done();
        });
      })
      .catch(done);
    });

    it('put generator, currentCollector does not exists in updated collector ' +
      'list, set to null', (done) => {
      const requestBody = JSON.parse(JSON.stringify(toPut));
      requestBody.possibleCollectors = [collector2.name, collector3.name];
      requestBody.isActive = true;
      api.put(`${path}/${generatorId}`)
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
        expect(collectorNames).to.deep.equal(['beautiful', 'world']);
        expect(res.body.currentCollector).to.equal(undefined);
        return done();
      });
    });

    it('put generator, currentCollector does not exist in updated collector ' +
     'list, set to the alive collector in the list', (done) => {
      const requestBody = JSON.parse(JSON.stringify(toPut));
      requestBody.possibleCollectors = [collector2.name, collectorAlive2.name];
      requestBody.isActive = true;
      api.put(`${path}/${generatorId}`)
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
        expect(collectorNames).to.deep.equal(['beautiful', 'IamAliveAndRunning2']);
        expect(res.body.currentCollector).to.equal('IamAliveAndRunning2');
        return done();
      });
    });
  });
});
