/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/admin/rebuildSampleStore.js
 */
'use strict';
const supertest = require('supertest');
const featureToggles = require('feature-toggles');
const sampleStore = require('../../../../cache/sampleStore');
const rcli = require('../../../../cache/redisCache').client.sampleStore;
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const tu = require('../../../testUtils');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const Sample = tu.db.Sample;
const jwtUtil = require('../../../../utils/jwtUtil');
const path = '/v1/admin/sampleStore/rebuild';
const expect = require('chai').expect;
const initialFeatureState = featureToggles
  .isFeatureEnabled(sampleStore.constants.featureName);

describe('tests/api/v1/admin/rebuildSampleStore.js >', () => {
  describe(`POST ${path} (feature is off) >`, () => {
    let token;
    const predefinedAdminUserToken = tu.createAdminToken();
    const uname = `${tu.namePrefix}test@test.com`;
    let testUserToken = '';

    /**
     * Register a non-admin user and an admin user; grab the predefined admin
     * user's token
     */
    before((done) => {
      tu.toggleOverride(sampleStore.constants.featureName, false);
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        api.post('/v1/register')
        .set('Authorization', token)
        .send({
          username: uname,
          email: uname,
          password: 'abcdefghijklmnopqrstuvwxyz',
        })
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          testUserToken = res.body.token;
          done();
        });
      })
      .catch(done);
    });

    after(u.forceDelete);
    after(tu.forceDeleteUser);
    after(() => tu.toggleOverride(sampleStore.constants.featureName,
      initialFeatureState));

    it('user is admin', (done) => {
      api.post(path)
      .set('Authorization', predefinedAdminUserToken)
      .send({})
      .expect(constants.httpStatus.BAD_REQUEST)
      .end(done);
    });

    it('user is NOT admin', (done) => {
      api.post(path)
      .set('Authorization', testUserToken)
      .send({})
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });
  });

  describe(`POST ${path} (feature is on) >`, () => {
    let token;
    const predefinedAdminUserToken = tu.createAdminToken();
    const uname = `${tu.namePrefix}test@test.com`;
    let testUserToken = '';
    let a1;
    let a2;
    let a3;
    let s1;
    let s2;
    let s3;

    /**
     * Register a non-admin user and an admin user; grab the predefined admin
     * user's token
     */
    before((done) => {
      tu.toggleOverride(sampleStore.constants.featureName, true);
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        api.post('/v1/register')
        .set('Authorization', token)
        .send({
          username: uname,
          email: uname,
          password: 'abcdefghijklmnopqrstuvwxyz',
        })
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          testUserToken = res.body.token;
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
            valueType: 'BOOLEAN',
            okRange: [10, 100],
          }))
          .then((created) => (a2 = created))
          .then(() => Aspect.create({
            isPublished: true,
            name: `${tu.namePrefix}Aspect3`,
            timeout: '10m',
            valueType: 'BOOLEAN',
            okRange: [10, 100],
          }))
          .then((created) => (a3 = created))
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
            subjectId: s2.id,
            aspectId: a1.id,
            value: '0',
            relatedLinks: [
              { name: 'Salesforce', value: 'http://www.salesforce.com' },
            ],
          }))
          .then(() => Sample.create({
            subjectId: s2.id,
            aspectId: a2.id,
            value: '50',
            relatedLinks: [
              { name: 'Salesforce', value: 'http://www.salesforce.com' },
            ],
          }))
          .then(() => Sample.create({
            subjectId: s3.id,
            aspectId: a1.id,
            value: '5',
            relatedLinks: [
              { name: 'Salesforce', value: 'http://www.salesforce.com' },
            ],
          }))
          .then(() => done())
          .catch(done);
        });
      });
    });

    after((done) => {
      u.forceDelete(done)
      .then(() => tu.forceDeleteUser)
      .then(() => rcli.flushallAsync())
      .then(() => tu.toggleOverride(sampleStore.constants.featureName,
        initialFeatureState))
      .then(() => done())
      .catch(done);
    });

    it('user is admin', (done) => {
      api.post(path)
      .set('Authorization', predefinedAdminUserToken)
      .send({})
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        return rcli.smembersAsync(sampleStore.constants.indexKey.aspect)
        .then((res) => {
          expect(res.includes('samsto:aspect:___aspect1')).to.be.true;
          expect(res.includes('samsto:aspect:___aspect2')).to.be.true;

          // Make sure aspects that don't have samples are *also* here
          expect(res.includes('samsto:aspect:___aspect3')).to.be.true;
        })
        .then(() => rcli.smembersAsync(sampleStore.constants.indexKey.sample))
        .then((res) => {
          expect(res
            .includes('samsto:sample:___subject1.___subject2|___aspect1'))
            .to.be.true;
          expect(res
            .includes('samsto:sample:___subject1.___subject2|___aspect2'))
            .to.be.true;
          expect(res
            .includes('samsto:sample:___subject1.___subject3|___aspect1'))
            .to.be.true;
        })
        .then(() => rcli.smembersAsync(sampleStore.constants.indexKey.subject))
        .then((res) => {
          expect(res.includes('samsto:subject:___subject1.___subject2'))
            .to.be.true;
          expect(res.includes('samsto:subject:___subject1.___subject3'))
            .to.be.true;
        })
        .then(done)
        .catch(done);
      });
    });

    it('user is NOT admin', (done) => {
      api.post(path)
      .set('Authorization', testUserToken)
      .send({})
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });
  });
});
