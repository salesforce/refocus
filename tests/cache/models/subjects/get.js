/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/subjects/get.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const path = '/v1/subjects';
const expect = require('chai').expect;

describe('tests/cache/models/subjects/get.js, ' +
'api::redisEnabled::GET specific subject >', () => {
  let token;
  const name = '___Subject1';
  const childAbsolutePath = '___Subject1.___Subject3';

  before((done) => {
    tu.toggleOverride('getSubjectFromCache', true);
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before(rtu.populateRedis);
  after(rtu.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));
  after(() => tu.toggleOverride('getSubjectFromCache', false));

  it('createdAt and updatedAt fields have the expected format', (done) => {
    api.get(`${path}/${name}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { updatedAt, createdAt } = res.body;
      expect(updatedAt).to.equal(new Date(updatedAt).toISOString());
      expect(createdAt).to.equal(new Date(createdAt).toISOString());
      done();
    });
  });

  it('get by name: limit, offset and sort does not affect result', (done) => {
    api.get(`${path}/${name}?limit=1&offset=2&sort=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.be.equal(name);
      expect(res.body.childCount).to.be.above(0);
      expect(res.body.hierarchyLevel).to.be.above(0);

      // 5 for [DELETE, GET, PATH, POST, PUT]
      expect(res.body.apiLinks.length).to.equal(5);
      expect(Array.isArray(res.body.tags)).to.be.true;
      expect(Array.isArray(res.body.relatedLinks)).to.be.true;
      expect(Array.isArray(res.body.relatedLinks)).to.be.true;
      done();
    });
  });

  it('basic get by name, OK', (done) => {
    api.get(`${path}/${name}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.be.equal(name);
      expect(res.body.childCount).to.be.an('number');
      expect(res.body.hierarchyLevel).to.be.an('number');

      // 5 for [DELETE, GET, PATH, POST, PUT]
      expect(res.body.apiLinks.length).to.equal(5);
      expect(Array.isArray(res.body.tags)).to.be.true;
      expect(Array.isArray(res.body.relatedLinks)).to.be.true;
      done();
    });
  });

  it('get by name is case in-sensitive', (done) => {
    api.get(`${path}/${name.toLowerCase()}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(name);
      done();
    });
  });

  it('get by name, wrong name', (done) => {
    api.get(path + '/abc')
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      expect(res.body.errors[0].type).to.equal('ResourceNotFoundError');
      done();
    });
  });

  it('get child by name with fields filter: two fields', (done) => {
    api.get(`${path}/${childAbsolutePath}?fields=name,absolutePath`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.absolutePath).to.be.equal(childAbsolutePath);
      expect((Object.keys(res.body)).length).to.equal(4);
      expect(Object.keys(res.body))
      .to.contain('name', 'absolutePath', 'id', 'apiLinks');
      done();
    });
  });

  it('get child by name returns defined childCount, hierarchyLevel',
  (done) => {
    api.get(`${path}/${childAbsolutePath}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.absolutePath).to.be.equal(childAbsolutePath);
      expect(res.body.childCount).to.be.an('number');
      expect(res.body.hierarchyLevel).to.be.an('number');
      done();
    });
  });

  it('get by name with fields filter: one field', (done) => {
    api.get(`${path}/${name}?fields=parentAbsolutePath`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.parentAbsolutePath).to.equal('');
      expect((Object.keys(res.body)).length).to.equal(3);
      expect(Object.keys(res.body))
      .to.contain('parentAbsolutePath', 'id', 'apiLinks');
      done();
    });
  });

  it('get by name with incorrect fields filter gives error', (done) => {
    api.get(`${path}/${name}?fields=name,y`)
    .set('Authorization', token)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      expect(res.body.errors[0].message)
      .to.contain('Request validation failed');
      done();
    });
  });
});
