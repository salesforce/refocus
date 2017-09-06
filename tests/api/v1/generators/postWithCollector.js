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

describe('tests/api/v1/generators/postWithCollector.js >', () => {
  let token;
  let collector1 = { name: 'hello' };
  let collector2 = { name: 'world' };
  const generator = u.getGenerator();
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  u.createSGtoSGTMapping(generatorTemplate, generator);

  before((done) => {
    Promise.all([
      tu.db.Collector.create(collector1),
      tu.db.Collector.create(collector2),
    ])
    .then((collectors) => {
      collector1 = collectors[ZERO];
      collector2 = collectors[ONE];
      generator.collectors = [collector1.name, collector2.name];
      console.log('generator collectors', generator.collectors)
      return tu.createToken()
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

  it('404 error for request body including a non-exitent collector');
  it('404 error for request body including an unregistered collector');

  it.only('simple post returns collectors field', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(generator)
    // .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      console.log(res.body)
      if (err) {
        return done(err);
      }

      // expect(res.body.collectors.length).to.equal(TWO);
      done();
    });
  });
});
