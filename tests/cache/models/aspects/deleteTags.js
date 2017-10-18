/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/aspects/deleteTags.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const allDeletePath = '/v1/aspects/{key}/tags';
const oneDeletePath = '/v1/aspects/{key}/tags/{akey}';
const redisOps = require('../../../../cache/redisOps');
const objectType = require('../../../../cache/sampleStore')
  .constants.objectType;
const samstoinit = rtu.samstoinit;

describe('tests/cache/models/aspects/deleteTags.js, ' +
`api: redisStore: aspects: DELETE tags >`, () => {
  let token;
  let aspId;
  let aspName;
  const tag0 = 'tag0';

  const n = {
    name: `${tu.namePrefix}ASPECTNAME`,
    timeout: '110s',
    tags: ['tag0', 'tag1'],
    isPublished: true,
  };

  before((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Aspect.create(n)
    .then((asp) => {
      aspId = asp.id;
      aspName = asp.name;
      return samstoinit.eradicate();
    })
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  afterEach(rtu.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('time fields have the expected format, after delete tags', (done) => {
    api.delete(allDeletePath.replace('{key}', aspId))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisOps.getHashPromise(objectType.aspect, n.name)
      .then((aspect) => {
        expect(aspect.createdAt)
          .to.equal(new Date(aspect.createdAt).toISOString());
        expect(aspect.updatedAt)
          .to.equal(new Date(aspect.updatedAt).toISOString());
        done();
      });
    });
  });

  it('delete all tags', (done) => {
    api.delete(allDeletePath.replace('{key}', aspId))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.tags).to.have.length(0);
      redisOps.getHashPromise(objectType.aspect, n.name)
      .then((aspect) => {
        expect(JSON.parse(aspect.tags)).to.have.length(0);
        done();
      });
    });
  });

  it('delete one tag', (done) => {
    api.delete(oneDeletePath.replace('{key}', aspId).replace('{akey}', tag0))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.members(['tag1']);
      redisOps.getHashPromise(objectType.aspect, n.name)
      .then((aspect) => {
        const tags = JSON.parse(aspect.tags);
        expect(tags).to.have.length(1);
        expect(tags).to.have.members(['tag1']);
        done();
      });
    });
  });

  it('delete tag by name', (done) => {
    api.delete(oneDeletePath.replace('{key}', aspName).replace('{akey}', tag0))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.members(['tag1']);
      redisOps.getHashPromise(objectType.aspect, n.name)
      .then((aspect) => {
        const tags = JSON.parse(aspect.tags);
        expect(tags).to.have.length(1);
        expect(tags).to.have.members(['tag1']);
        done();
      });
    });
  });

  it('no error if tag not found, no update on tags', (done) => {
    api.delete(oneDeletePath.replace('{key}', aspId).replace('{akey}', 'x'))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.tags).to.have.length(2);
      expect(res.body.tags).to.have.members(['tag1', 'tag0']);
      redisOps.getHashPromise(objectType.aspect, n.name)
      .then((aspect) => {
        const tags = JSON.parse(aspect.tags);
        expect(tags).to.have.length(2);
        expect(tags).to.have.members(['tag1', 'tag0']);
        done();
      });
    });
  });
});
