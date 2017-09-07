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
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;

describe('tests/api/v1/generators/postWithCollector.js >', () => {
  let token;
  let collector1 = { name: 'hello' };
  let collector2 = { name: 'beautiful' };
  let collector3 = { name: 'world' };
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
  afterEach(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  it('simple post returns collectors field', (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    localGenerator.collectors = [
      collector1.name,
      collector2.name,
      collector3.name,
    ];
    api.post(path)
    .set('Authorization', token)
    .send(localGenerator)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.collectors.length).to.equal(THREE);
      expect(res.body.collectors[ZERO].name).to.equal(collector1.name);
      expect(res.body.collectors[ONE].name).to.equal(collector2.name);
      expect(res.body.collectors[TWO].name).to.equal(collector3.name);
      done();
    });
  });

  it('404 error for request body with an non-existant collector',
    (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    localGenerator.collectors = ['iDontExist'];
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
      done();
    });
  });

  it('404 error for request body with an existing and a non-existant collector',
    (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    localGenerator.collectors = [collector1.name, 'iDontExist'];
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
      done();
    });
  });
});
