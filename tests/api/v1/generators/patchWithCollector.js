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
      return gen.addCollectors([collector1]);
    })
    .then(() => done())
    .catch(done);
  });

  // delete generator after each test
  afterEach(() => tu.forceDelete(tu.db.Generator, testStartTime));
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

      const { name, collectors } = res.body;
      expect(name).to.equal(_name);
      expect(collectors.length).to.equal(ONE);
      expect(collectors[ZERO].name).to.equal(collector1.name);
      done();
    });
  });

  it('ok: PATCH to add new collectors', (done) => {
    api.patch(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send({ collectors: [collector2.name, collector3.name] })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { collectors } = res.body;
      expect(Array.isArray(collectors)).to.be.true;
      expect(collectors.length).to.equal(THREE);
      const collectorNames = collectors.map((collector) => collector.name);
      expect(collectorNames).to.deep.equal(sortedNames);
      done();
    });
  });

  it('ok: PATCH to a collector that is already attached to the generator', (done) => {
    api.patch(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send({ collectors: [collector1.name] })
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
    const _collectors = [collector1.name, collector1.name];
    api.patch(`${path}/${generatorId}`)
    .set('Authorization', token)
    .send({ collectors: _collectors })
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
    .send({ collectors: _collectors })
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
