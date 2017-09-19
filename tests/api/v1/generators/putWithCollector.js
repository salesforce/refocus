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
  let collector1 = { name: 'hello', version: '1.0.0' };
  let collector2 = { name: 'beautiful', version: '1.0.0' };
  let collector3 = { name: 'world', version: '1.0.0' };
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
      name: 'refocus-ok-generator-template',
      version: '1.0.0',
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
    .then(() => done())
    .catch(done);
  });

  beforeEach((done) => {
    Generator.create(generator)
    .then((gen) => {
      generatorId = gen.id;
      return gen.addCollectors([collector1]);
    })
    .then(() => done())
    .catch(done);
  });

  // delete generator after each test
  afterEach(() => tu.forceDelete(tu.db.Generator, testStartTime));
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

      const { name, collectors } = res.body;
      expect(name).to.equal(toPut.name);
      expect(collectors.length).to.equal(ZERO);
      done();
    });
  });

  it('ok: replace collector with more collectors', (done) => {
    const withCollectors = JSON.parse(JSON.stringify(toPut));
    withCollectors.collectors = [collector2.name, collector3.name];
    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(withCollectors)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { collectors } = res.body;
      expect(Array.isArray(collectors)).to.be.true;
      expect(collectors.length).to.equal(TWO);
      const collectorNames = collectors.map((collector) => collector.name);
      expect(collectorNames).to.contain(collector2.name);
      expect(collectorNames).to.contain(collector3.name);
      done();
    });
  });

  it('ok: attach identical collector does alter collector', (done) => {
    const withCollectors = JSON.parse(JSON.stringify(toPut));
    withCollectors.collectors = [collector1.name];
    api.put(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send(withCollectors)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { collectors } = res.body;
      expect(collectors.length).to.equal(ONE);
      expect(collectors[ZERO].name).to.equal(collector1.name);
      done();
    });
  });

  it('400 error with duplicate collectors in request body', (done) => {
    const requestBody = JSON.parse(JSON.stringify(toPut));
    requestBody.collectors = [collector1.name, collector1.name];
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
    requestBody.collectors = [collector1.name, 'iDontExist'];
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
      done();
    });
  });
});
