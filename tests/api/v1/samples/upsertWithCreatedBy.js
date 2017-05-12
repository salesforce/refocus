/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/postWithCreatedBy.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const ZERO = 0;
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const adminUser = require('../../../../config').db.adminUser;
const predefinedAdminUserToken = tu.createTokenFromUserName(adminUser.name, adminUser.name);

describe(`api: upsert without cache`, () => {
  const path = '/v1/samples/upsert';
  let aspect;
  let subject;
  let token;
  let user;
  const DONT_EXIST_NAME = 'iDontExist';

  before((done) => {
    tu.toggleOverride('returnCreatedBy', true);
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

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('returnCreatedBy', false));

  describe(`when sample does not exist`, () => {
    it('upsert succeeds when token is provided, and the result returns ' +
      ' non-empty createdBy and user fields', (done) => {
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

  describe('when the sample already exists', () => {
    beforeEach((done) => {
      Sample.create({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '1',
        aspectId: aspect.id,
        subjectId: subject.id,
        createdBy: user.id,
      })
      .then(() => done())
      .catch(done);
    });

    afterEach(u.forceDelete);
    after(tu.forceDeleteUser);
    after(() => tu.toggleOverride('returnCreatedBy', false));

    it('upsert succeeds WITH token of another user, and the result returns ' +
      ' the original createdBy and user fields', (done) => {
      api.get('/v1/samples/' + `${subject.absolutePath}|${aspect.name}`)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.createdBy).to.equal(user.id);
        expect(res.body.user).to.be.an('object');
        expect(res.body.user.name).to.equal(user.name);
        expect(res.body.user.email).to.equal(user.email);

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
          expect(res.body.user).to.be.an('object');
          expect(res.body.user.name).to.equal(user.name);
          expect(res.body.user.email).to.equal(user.email);
          done();
        });
      });
    });

    it('upsert succeeds even WITHOUT token, and the result returns ' +
      ' the original createdBy and user fields', (done) => {
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

        expect(res.body.createdBy).to.equal(user.id);
        expect(res.body.user).to.be.an('object');
        expect(res.body.user.name).to.equal(user.name);
        expect(res.body.user.email).to.equal(user.email);
        done();
      });
    });
  });

  it('on bulkUpsert another sample WITHOUT cache, ' +
    'createdBy and user fields are returned');

  it('on bulkUpsert another sample WITH cache, ' +
    'createdBy and user fields are returned');
});