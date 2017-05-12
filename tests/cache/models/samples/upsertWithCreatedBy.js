/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/upsert.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const redisOps = require('../../../../cache/redisOps');
const rtu = require('../redisTestUtil');
const samstoinit = require('../../../../cache/sampleStoreInit');
const sampleStore = require('../../../../cache/sampleStore');
const redisClient = require('../../../../cache/redisCache').client.sampleStore;
const u = require('./utils');
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const adminUser = require('../../../../config').db.adminUser;
const predefinedAdminUserToken = tu.createTokenFromUserName(adminUser.name, adminUser.name);
const path = '/v1/samples/upsert';

describe(`api::redisEnabled::POST::upsert ${path} when sample does not exist`, () => {
  let user;
  let aspect;
  let subject;
  let token;
  const URL1 = 'https://samples.com';
  const URL2 = 'https://updatedsamples.com';
  const relatedLinks = [
    { name: 'link1', url: URL1 },
    { name: 'link2', url: URL1 },
  ];
  const updatedRelatedLinks = [
    { name: 'link1', url: URL2 },
    { name: 'link2', url: URL2 },
  ];

  before((done) => {
    tu.toggleOverride('returnCreatedBy', true);
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createUserAndToken()
    .then((obj) => {
      token = obj.token;
      user = obj.user;
      done();
    })
    .catch((err) => done(err));
  });

  beforeEach((done) => {
    Aspect.create(u.aspectToCreate)
    .then((a) => {
      aspect = a;
      return Subject.create(u.subjectToCreate);
    })
    .then((s) => {
      subject = s;
      return samstoinit.eradicate();
    })
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  afterEach(rtu.forceDelete);
  afterEach(rtu.flushRedis);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));
  after(() => tu.toggleOverride('returnCreatedBy', false));

  it('when token is provided, createdBy field ' +
    'and user object is returned', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
    })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.createdBy).to.be.an('string');
      expect(res.body.user).to.be.an('object');
      expect(res.body.user.name).to.be.an('string');
      expect(res.body.user.email).to.be.an('string');
      const cmds = [];
      cmds.push(redisOps.aspExistsInSubjSetCmd(subject.absolutePath, aspect.name));
      redisOps.executeBatchCmds(cmds)
      .then((response) => {
        expect(response[0]).to.be.equal(1);
      });

      done();
    });
  });

  it('if token is NOT provided, upsert fails', (done) => {
    api.post(path)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.createdBy).to.be.undefined;
      expect(res.body.user).to.be.undefined;
      done();
    });
  });

  it('on invalid token, upsert fails', (done) => {
    api.post(path)
    .set('Authorization', 'iDontExist')
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.createdBy).to.be.undefined;
      expect(res.body.user).to.be.undefined;
      done();
    });
  });

  it('on revoked token, createdBy and user fields are returned', (done) => {
    const tokenPath = '/v1/tokens';
    api.post(tokenPath)
    .set('Authorization', token)
    .send({ name: 'newToken' })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const newToken = res.body.token;
      return api.post(`${tokenPath}/${res.body.id}/revoke`)
      .set('Authorization', predefinedAdminUserToken)
      .send({ })
      .end((err2, res2) => {
        if (err2 || res2.body.errors) {
          return done(err2);
        }

        api.post(path)
        .set('Authorization', 'iDontExist')
        .send({
          name: `${subject.absolutePath}|${aspect.name}`,
        })
        .expect(constants.httpStatus.OK)
        .end((err, res ) => {
          if (err) {
            done(err);
          }

          expect(res.body.createdBy).to.be.an('string');
          expect(res.body.user).to.be.an('object');
          expect(res.body.user.name).to.be.an('string');
          expect(res.body.user.email).to.be.an('string');
          done();
        });
      });
    });
  });

  describe('upsert when the sample already exists', () => {
    beforeEach((done) => {
      const subjKey = sampleStore.toKey(
        sampleStore.constants.objectType.subject, subject.absolutePath
      );
      const sampleKey = sampleStore.toKey(
        sampleStore.constants.objectType.sample, `${subject.absolutePath}|${aspect.name}`
      );

      // need add createdBy and user object
      const aspectName = aspect.name;
      redisClient.batch([
        ['sadd', subjKey, aspectName],
        ['sadd', sampleStore.constants.indexKey.sample, sampleKey],
        ['hmset', sampleKey, {
          name: `${subject.absolutePath}|${aspect.name}`,
          value: '1',
          aspectId: aspect.id,
          subjectId: subject.id,
          previousStatus: 'Invalid',
          status: 'Invalid',
          user: JSON.stringify({ name: user.name, email: user.email }),
          createdBy: user.id,
        },
        ],
      ]).execAsync()
      .then(() => {
        done();
      })
      .catch(done);
    });

    it('createdBy field and user object is returned', (done) => {
      api.get('/v1/samples?name=' + `${subject.absolutePath}|${aspect.name}`)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body).to.have.length(1);
        api.post(path)
        .set('Authorization', token)
        .send({
          name: `${subject.absolutePath}|${aspect.name}`,
        })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body.createdBy).to.be.an('string');
          expect(res.body.user).to.be.an('object');
          expect(res.body.user.name).to.be.an('string');
          expect(res.body.user.email).to.be.an('string');
          done();
        });
      });
    });

    it('on update by a different user, createdBy and ' +
      'user object are NOT updated', (done) => {
      api.post(path)
      .set('Authorization', predefinedAdminUserToken)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.createdBy).to.equal(user.id);
        expect(res.body.user.name).to.equal(user.name);
        expect(res.body.user.email).to.equal(user.email);
        done();
      });
    });
  });
});
