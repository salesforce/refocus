/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generatorTemplates/post.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/generatorTemplates';
const GeneratorTemplate = tu.db.GeneratorTemplate;
const expect = require('chai').expect;
const ZERO = 0;

describe('tests/api/v1/generatorTemplates/post.js > ', () => {
  let token;
  const generatorTemplate = u.getGeneratorTemplate();
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('simple post OK', (done) => {
    const gt = JSON.parse(JSON.stringify(generatorTemplate));
    gt.name += 'spo';
    api.post(path)
    .set('Authorization', token)
    .send(gt)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.apiLinks).to.be.an('Array');
      expect(res.body.name).to.include(gt.name);
      expect(res.body.id).to.not.equal(undefined);
      expect(res.body).to.have.any.keys(Object.keys(generatorTemplate));
      return done();
    });
  });

  it('simple post without required fields', (done) => {
    const gt = JSON.parse(JSON.stringify(generatorTemplate));
    delete gt.name;
    delete gt.author;
    delete gt.connection;
    delete gt.transform;
    delete gt.version;

    api.post(path)
    .set('Authorization', token)
    .send(gt)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (!err) {
        return done('Expecting "Schema Validation Failed" error');
      }

      const errorArray = JSON.parse(res.text).errors;
      expect(errorArray.length).to.equal(5);
      expect(errorArray[ZERO].type).to.equal('SCHEMA_VALIDATION_FAILED');
      return done();
    });
  });

  describe('post duplicate fails > ', () => {
    before((done) => {
      GeneratorTemplate.create(generatorTemplate)
      .then(() => done())
      .catch(done);
    });

    it('with identical name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(generatorTemplate)
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
      const gt = JSON.parse(JSON.stringify(generatorTemplate));
      gt.name = gt.name.toLowerCase();
      api.post(path)
      .set('Authorization', token)
      .send(gt)
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
