/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/subjects/post.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const path = '/v1/subjects';
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const samstoinit = rtu.samstoinit;
const Subject = tu.db.Subject;
const expect = require('chai').expect;

describe('tests/cache/models/subjects/post.js >', () => {
  const parentName = `${tu.namePrefix}NorthAmerica`;
  const childName = `${tu.namePrefix}Canada`;
  const par = { name: parentName, isPublished: true };
  let token;

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

  beforeEach((done) => {
    Subject.create(par)
    .then(() => Subject.create({
      name: childName,
      parentAbsolutePath: parentName,
    }))
    .then(() => samstoinit.eradicate())
    .then(() => samstoinit.populate())
    .then(() => done())
    .catch(done);
  });

  afterEach(rtu.forceDelete);
  after(rtu.forceDeleteUserAndProf);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));
  after(() => tu.toggleOverride('getSubjectFromCache', false));

  it('no parent: duplicate name should fail from the cache', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({ name: parentName })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('DuplicateResourceError');
      expect(res.body.errors[0].message)
      .to.equal('The subject lower case absolutePath must be unique');
      expect(res.body.errors[0].source).to.equal('Subject');
      done();
    });
  });

  it('with parent: duplicate absolutePath should fail from the cache',
    (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({ name: childName, parentAbsolutePath: parentName })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('DuplicateResourceError');
      expect(res.body.errors[0].message)
      .to.equal('The subject lower case absolutePath must be unique');
      expect(res.body.errors[0].source).to.equal('Subject');
      done();
    });
  });
});
