/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/post.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/generators';
const Generator = tu.db.Generator;
const expect = require('chai').expect;
const ZERO = 0;

describe('tests/api/v1/generators/post.js >', () => {
  let token;
  const generator = u.getGenerator();
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('simple post OK', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(generator)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.apiLinks).to.be.an('Array');
      expect(res.body.name).to.include(generator.name);
      expect(res.body.id).to.not.equal(undefined);
      expect(res.body).to.have.any.keys(Object.keys(generator));
      done();
    });
  });

  it('simple post without requred fields', (done) => {
    const _generator = JSON.parse(JSON.stringify(generator));
    delete _generator.name;
    delete _generator.aspects;
    api.post(path)
    .set('Authorization', token)
    .send(_generator)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (!err) {
        return done('Expecting "Schema Validation Failed" error');
      }

      const errorArray = JSON.parse(res.text).errors;
      expect(errorArray.length).to.equal(2);
      expect(errorArray[ZERO].type).to.equal('SCHEMA_VALIDATION_FAILED');
      done();
    });
  });

  describe('post duplicate fails >', () => {
    beforeEach((done) => {
      Generator.create(generator)
      .then(() => done())
      .catch(done);
    });

    it('with identical name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(generator)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type).to.equal(tu.uniErrorName);
        done();
      });
    });

    it('with case different name', (done) => {
      generator.name = generator.name.toLowerCase();
      api.post(path)
      .set('Authorization', token)
      .send(generator)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type).to.equal(tu.uniErrorName);
        done();
      });
    });
  });
});
