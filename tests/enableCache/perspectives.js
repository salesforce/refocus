/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/enableCache/perspectives.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../index').app);
const constants = require('../../api/v1/constants');
const tu = require('../testUtils');
const u = require('./utils');
const path = '/v1/perspectives';
const expect = require('chai').expect;
const redisCache = require('../../cache/redisCache').client.cache;
const ZERO = 0;
const ONE = 1;
const featureToggles = require('feature-toggles');
const enableApiActivityLogs =
  featureToggles.isFeatureEnabled('enableApiActivityLogs');

describe(`tests/enableCache/perspectives.js, api: GET ${path} >`, () => {
  let lensId;
  let token;
  let perspectiveId;

  before((done) => {
    tu.toggleOverride('enableCachePerspective', true);
    redisCache.flushdb();
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
    })
    .then(() => u.doSetup())
    .then((createdLens) => tu.db.Perspective.create({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLens.id,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature', 'humidity'],
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilter: ['Critical', '-OK'],
    }))
    .then((createdPersp) => {
      lensId = createdPersp.lensId;
      perspectiveId = createdPersp.id;
      return done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => {
    tu.toggleOverride('enableCachePerspective', false);
  });

  it('basic get', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ONE);
      expect(res.body[ZERO].name).to.be.equal('___testPersp');
      expect(res.body).to.have.deep.property('[0].lensId', lensId);
      return done();
    });
  });

  it('basic get, response present in cache', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisCache.get('/v1/perspectives', (cacheErr, reply) => {
        if (reply) {
          const jsonReply = JSON.parse(reply);
          expect(jsonReply).to.have.length(ONE);
          expect(jsonReply[ZERO].name).to.be.equal('___testPersp');
          expect(jsonReply).to.have.deep.property('[0].lensId', lensId);
          return done();
        } else {
          return done(new Error('Expected response value in cache'));
        }
      });
    });
  });

  it('After PATCH on perspective, response should not be present in cache',
    (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      api.patch(`${path}/${perspectiveId}`)
      .set('Authorization', token)
      .send({ rootSubject: 'changedMainSubject' })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        redisCache.get('/v1/perspectives', (cacheErr, reply) => {
          expect(reply).to.not.exist;
          return done();
        });
      });
    });
  });

  it('After PUT on perspective, response should not be present in cache',
    (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      api.put(`${path}/${perspectiveId}`)
      .set('Authorization', token)
      .send({
        name: '___testPersp',
        lensId: lensId,
        rootSubject: 'myMainSubject',
        aspectFilter: ['temperature', 'humidity'],
        aspectTagFilter: ['temp', 'hum'],
        subjectTagFilter: ['ea', 'na'],
        aspectFilterType: 'INCLUDE',
        aspectTagFilterType: 'INCLUDE',
        subjectTagFilterType: 'INCLUDE',
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        redisCache.get('/v1/perspectives', (cacheErr, reply) => {
          expect(reply).to.not.exist;
          return done();
        });
      });
    });
  });

  it('basic get, response present in cache with enableApiActivityLogs',
    (done) => {
    tu.toggleOverride('enableApiActivityLogs', true);
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisCache.get('/v1/perspectives', (cacheErr, reply) => {
        if (reply) {
          const jsonReply = JSON.parse(reply);
          expect(jsonReply).to.have.length(ONE);
          expect(jsonReply[ZERO].name).to.be.equal('___testPersp');
          expect(jsonReply).to.have.deep.property('[0].lensId', lensId);
          tu.toggleOverride('enableApiActivityLogs', enableApiActivityLogs);
          return done();
        } else {
          return done(new Error('Expected response value in cache'));
        }
      });
    });
  });

  it('get with limit and sort', (done) => {
    api.get(path + '?limit=10&sort=name')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ONE);
      expect(res.body[ZERO].name).to.be.equal('___testPersp');
      expect(res.body).to.have.deep.property('[0].lensId', lensId);
      return done();
    });
  });

  it('get with limit and sort, response not present in cache', (done) => {
    api.get(path + '?limit=10&sort=name')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisCache.get('{"order":["name"],"limit":10,"where":{}}',
      (cacheErr, reply) => {
        expect(reply).to.not.exist;
        return done();
      });
    });
  });

  it('basic get by id', (done) => {
    api.get(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(`${tu.namePrefix}testPersp`);
      expect(res.body.rootSubject).to.equal('myMainSubject');
      expect(res.body.lensId).to.equal(lensId);
      return done();
    });
  });

  it('basic get by id, response present in cache', (done) => {
    redisCache.get(perspectiveId,
      (cacheErr, reply) => {
        if (reply) {
          const jsonReply = JSON.parse(reply);
          expect(jsonReply.name).to.equal(`${tu.namePrefix}testPersp`);
          expect(jsonReply.rootSubject).to.equal('myMainSubject');
          expect(jsonReply.lensId).to.equal(lensId);
          return done();
        } else {
          return done(new Error('Expected response value in cache'));
        }
      });
  });
});
