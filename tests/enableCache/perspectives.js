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

describe(`api: GET ${path}`, () => {
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
      done();
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
        done(err);
      }

      expect(res.body).to.have.length(ONE);
      expect(res.body[ZERO].name).to.be.equal('___testPersp');
      expect(res.body).to.have.deep.property('[0].lensId', lensId);

      done();
    });
  });

  it('basic get, response present in cache', (done) => {
    redisCache.get('{\"where\":{}}', (cacheErr, reply) => {
      if (reply) {
        const jsonReply = JSON.parse(reply);
        expect(jsonReply).to.have.length(ONE);
        expect(jsonReply[ZERO].name).to.be.equal('___testPersp');
        expect(jsonReply).to.have.deep.property('[0].lensId', lensId);

        done();
      } else {
        throw new Error('Expected response value in cache');
      }
    });
  });

  it('get with limit and sort', (done) => {
    api.get(path + '?limit=10&sort=name')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body).to.have.length(ONE);
      expect(res.body[ZERO].name).to.be.equal('___testPersp');
      expect(res.body).to.have.deep.property('[0].lensId', lensId);

      done();
    });
  });

  it('get with limit and sort, response present in cache', (done) => {
    redisCache.get('{"order":["name"],"limit":10,"where":{}}',
      (cacheErr, reply) => {
        if (reply) {
          const jsonReply = JSON.parse(reply);
          expect(jsonReply).to.have.length(ONE);
          expect(jsonReply[ZERO].name).to.be.equal('___testPersp');
          expect(jsonReply).to.have.deep.property('[0].lensId', lensId);

          done();
        } else {
          throw new Error('Expected response value in cache');
        }
      });
  });

  it('basic get by id', (done) => {
    api.get(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.name).to.equal(`${tu.namePrefix}testPersp`);
      expect(res.body.rootSubject).to.equal('myMainSubject');
      expect(res.body.lensId).to.equal(lensId);

      done();
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

          done();
        } else {
          throw new Error('Expected response value in cache');
        }
      });
  });
});
