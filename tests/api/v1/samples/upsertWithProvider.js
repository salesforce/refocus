/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/upsertWithProvider.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Sample = tu.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const predefinedAdminUserToken = tu.createAdminToken();

describe(`tests/api/v1/samples/upsertWithProvider.js, upsert without cache >`,
() => {
  const path = '/v1/samples/upsert';
  let aspect;
  let subject;
  let token;
  let user;
  const DONT_EXIST_NAME = 'iDontExist';
  const expectedValue = '100';

  before((done) => {
    tu.toggleOverride('returnUser', true);
    tu.createUserAndToken()
    .then((obj) => {
      token = obj.token;
      user = obj.user;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Aspect.create(u.aspectToCreate)
    .then((a) => {
      aspect = a;
      return Subject.create(u.subjectToCreate);
    })
    .then((s) => {
      subject = s;
      done();
    })
    .catch(done);
  });

  beforeEach(u.populateRedis);
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('returnUser', false));

  describe('new sample >', () => {
    it('return provider and user fields', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.provider).to.be.an('string');
        expect(res.body.user).to.be.an('object');
        expect(res.body.user.name).to.be.an('string');
        expect(res.body.user.email).to.be.an('string');
        done();
      });
    });
  });

  describe('existing sample >', () => {
    beforeEach((done) => {
      Sample.create({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '1',
        aspectId: aspect.id,
        subjectId: subject.id,
        provider: user.id,
      }, user)
      .then(() => done())
      .catch(done);
    });

    beforeEach(u.populateRedis);
    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);
    after(() => tu.toggleOverride('returnUser', false));

    it('upsert with token of another user, return original provider and user',
    (done) => {
      api.get('/v1/samples/' + `${subject.absolutePath}|${aspect.name}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.provider).to.equal(user.id);
        expect(res.body.user).to.be.an('object');
        expect(res.body.user.name).to.equal(user.name);
        expect(res.body.user.email).to.equal(user.email);

        api.post(path)
        .set('Authorization', predefinedAdminUserToken)
        .send({
          name: `${subject.absolutePath}|${aspect.name}`,
          value: expectedValue,
        })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.value).to.equal(expectedValue);
          expect(res.body.provider).to.equal(user.id);
          expect(res.body.user).to.be.an('object');
          expect(res.body.user.name).to.equal(user.name);
          expect(res.body.user.email).to.equal(user.email);
          done();
        });
      });
    });
  });
});
