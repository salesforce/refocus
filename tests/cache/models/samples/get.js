/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/get.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const path = '/v1/samples';
const samstoinit = require('../../../../cache/sampleStoreInit');
const expect = require('chai').expect;
const redisCache = require('../../../../cache/redisCache').client.cache;
const featureToggles = require('feature-toggles');
const enableRedisSampleStore =
  featureToggles.isFeatureEnabled('enableRedisSampleStore');

describe('tests/cache/models/samples/get.js, ' +
`api::redisEnabled::GET ${path} >`, () => {
  let userId;
  let token;
  const s1s2a1 = '___Subject1.___Subject2|___Aspect1';
  const s1s2a2 = '___Subject1.___Subject2|___Aspect2';
  const s1s3a1 = '___Subject1.___Subject3|___Aspect1';

  before((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createUserAndToken()
    .then((obj) => {
      userId = obj.user.id;
      token = obj.token;
      done();
    })
    .catch(done);
  });

  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore',
    enableRedisSampleStore));

  describe('should return user object with profile field >', () => {
    const Aspect = tu.db.Aspect;
    const Subject = tu.db.Subject;
    const Sample = tu.db.Sample;
    let a1;
    let a2;
    let s1;
    let s2;
    let s3;
    before((done) => {
      Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}Aspect1`,
        timeout: '30s',
        valueType: 'NUMERIC',
        criticalRange: [0, 1],
        relatedLinks: [
          { name: 'Google', value: 'http://www.google.com' },
          { name: 'Yahoo', value: 'http://www.yahoo.com' },
        ],
      })
      .then((created) => (a1 = created))
      .then(() => Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}Aspect2`,
        timeout: '10m',
        valueType: 'NUMERIC',
        okRange: [10, 100],
      }))
      .then((created) => (a2 = created))
      .then(() => Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject1`,
      }))
      .then((created) => (s1 = created))
      .then(() => Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject2`,
        parentId: s1.id,
      }))
      .then((created) => (s2 = created))
      .then(() => Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject3`,
        parentId: s1.id,
      }))
      .then((created) => (s3 = created))
      .then(() => Sample.create({
        provider: userId,
        messageCode: '25',
        subjectId: s2.id,
        aspectId: a1.id,
        value: '0',
        relatedLinks: [
          { name: 'Salesforce', value: 'http://www.salesforce.com' },
        ],
      }))
      .then(() => Sample.create({
        provider: userId,
        messageCode: '50',
        subjectId: s2.id,
        aspectId: a2.id,
        value: '50',
        relatedLinks: [
          { name: 'Salesforce', value: 'http://www.salesforce.com' },
        ],
      }))
      .then(() => Sample.create({
        provider: userId,
        previousStatus: 'Critical',
        messageCode: '10',
        subjectId: s3.id,
        aspectId: a1.id,
        value: '5',
        relatedLinks: [
          { name: 'Salesforce', value: 'http://www.salesforce.com' },
        ],
      }))
      .then(() => samstoinit.populate())
      .then(() => done())
      .catch(done);
    });
    after(rtu.forceDelete);

    it('get all contains user and profile object', (done) => {
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.header).to.have.property('x-total-count', '3');
        for (let i = res.body.length - 1; i >= 0; i--) {
          const { user } = res.body[i];
          expect(user).to.be.an('object');
          expect(user.name).to.be.an('string');
          expect(user.email).to.be.an('string');
          expect(user.profile).to.be.an('object');
          expect(user.profile.name).to.be.an('string');
        }

        done();
      });
    });

    it('get by name contains user and profile object', (done) => {
      const sampleName = '___subject1.___SUBJECT3|___AspECT1';
      api.get(`${path}/${sampleName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const { user } = res.body;
        expect(user).to.be.an('object');
        expect(user.name).to.be.an('string');
        expect(user.email).to.be.an('string');
        expect(user.profile).to.be.an('object');
        expect(user.profile.name).to.be.an('string');
        done();
      });
    });
  });
});

describe('tests/cache/models/samples/get.js > cache the response >', () => {
  let token;
  const s1s2a1 = '___Subject1.___Subject2|___Aspect1';
  const s1s2a2 = '___Subject1.___Subject2|___Aspect2';
  const s1s3a1 = '___Subject1.___Subject3|___Aspect1';

  before((done) => {
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

  after(() => {
    tu.toggleOverride('enableRedisSampleStore', enableRedisSampleStore);
  });

  it('get with wildcard should cache response', (done) => {
    api.get(`${path}?name=___Subj*`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisCache.get('___Subj*', (cacheErr, reply) => {
        if (cacheErr) {
          return done(cacheErr);
        }

        expect(JSON.parse(reply).length).to.be.equal(3);
        expect(JSON.parse(reply)[0].name).to.equal(s1s2a1);
        redisCache.del('___Subj*');
        return done();
      });
    });
  });

  it('get without wildcard should not cache response', (done) => {
    api.get(`${path}?name=___Subject1.___Subject2|___Aspect1`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisCache.get('___Subject1.___Subject2|___Aspect1',
        (cacheErr, reply) => {
        if (cacheErr || !reply) {
          expect(res.body.length).to.be.equal(1);
          expect(res.body[0].name).to.equal(s1s2a1);
          return done();
        }
      });
    });
  });

  it('do not return response from cache if ?fields are different', (done) => {
    api.get(`${path}?name=___Subj*`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisCache.get('___Subj*', (cacheErr, reply) => {
        if (cacheErr) {
          return done(cacheErr);
        }

        expect(JSON.parse(reply).length).to.be.equal(3);
        redisCache.get('___Subj*&fields=name,status', (cacheErr2, reply2) => {
          if (cacheErr2) {
            return done(cacheErr2);
          }

          expect(reply2).to.be.null;
          return done();
        });
      });
    });
  });
});
