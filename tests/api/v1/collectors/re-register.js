/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/re-register.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const Promise = require('bluebird');
supertest.Test.prototype.endAsync = Promise.promisify(supertest.Test.prototype.end);
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const startPath = '/v1/collectors/{key}/start';
const deRegisterPath = '/v1/collectors/{key}/deregister';
const reRegisterPath = '/v1/collectors/{key}/reregister';
const Collector = tu.db.Collector;
const expect = require('chai').expect;

describe('tests/api/v1/collectors/re-register.js >', () => {
  let collectorId;
  let userToken;
  let collectorToken;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      userToken = returnedToken;
      done();
    })
    .catch(done);
  });

  /**
   * TODO: change this to use /v1/collectors/:key/start to register the collector
   * once that has been set up
   */
  function postCollector(collector) {
    return api.post('/v1/collectors')
    .set('Authorization', userToken)
    .send(collector)
    .expect(201)
    .endAsync()
    .then((res) => {
      collectorToken = res.body.token;
      collectorId = res.body.id;
    });
  }

  function deRegisterCollector(_id) {
    return api.post(deRegisterPath.replace('{key}', _id))
    .set('Authorization', collectorToken)
    .send({})
    .expect(constants.httpStatus.OK)
    .endAsync()
    .then((res) => {
      expect(res.body.registered).to.be.false;
    });
  }

  beforeEach((done) => {
    Promise.resolve()
    .then(() => postCollector(u.toCreate))
    .then(() => done()).catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('fails when the user token is provided instead of collector token',
  (done) => {
    deRegisterCollector(collectorId)
    .then(() => {
      api.post(reRegisterPath.replace('{key}', collectorId))
      .set('Authorization', userToken)
      .send({})
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].description).to.be.equal(
          'Invalid/No Token provided.'
        );
        done();
      });
    });
  });

  it('fails with registered collector', (done) => {
    api.post(reRegisterPath.replace('{key}', collectorId))
    .set('Authorization', collectorToken)
    .send({})
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description).to.equal(
        'Cannot Re-register a collector that is currently registered.');
      done();
    });
  });

  it('ok with de-registered collector, updates the collector to be registered',
    (done) => {
    deRegisterCollector(collectorId)
    .then(() => {
      api.post(reRegisterPath.replace('{key}', collectorId))
      .set('Authorization', collectorToken)
      .send({})
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.registered).to.be.true;
        done();
      });
    });
  });
});
