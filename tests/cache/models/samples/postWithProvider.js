/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/postWithProvider.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const adminUser = require('../../../../config').db.adminUser;
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const path = '/v1/samples';
const rtu = require('../redisTestUtil');
const rcli = rtu.rcli;
const redisOps = require('../../../../cache/redisOps');
const objectType = require('../../../../cache/sampleStore')
  .constants.objectType;
const samstoinit = require('../../../../cache/sampleStoreInit');
const expect = require('chai').expect;
const ZERO = 0;
const u = require('./utils');

describe('tests/cache/models/samples/postWithProvider.js, ' +
`api: redisStore: POST ${path} with provider, returnUser toggle on`, () => {
  let sampleToPost;
  let token;
  const sampleName = `${tu.namePrefix}TEST_SUBJECT` + '.' +
  `${tu.namePrefix}CHILD_SUBJECT` + '|' + `${tu.namePrefix}TEST_ASPECT`;

  before((done) => {
    tu.toggleOverride('returnUser', true);
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    new tu.db.Sequelize.Promise((resolve, reject) => {
      const samp = { value: '1' };
      tu.db.Aspect.create(u.aspectToCreate)
      .then((a) => {
        samp.aspectId = a.id;
        return tu.db.Subject.create(u.subjectToCreate);
      })
      .then((s) => tu.db.Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}CHILD_SUBJECT`,
        parentId: s.id,
      }))
      .then((s) => {
        samp.subjectId = s.id;
        resolve(samp);
      })
      .catch((err) => reject(err));
    })
    .then((samp) => {
      sampleToPost = samp;
      return samstoinit.eradicate();
    })
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  afterEach(rtu.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));
  after(() => tu.toggleOverride('returnUser', false));

  it('provider and user object returned and fields also in cache', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.provider).to.be.an('string');
      expect(res.body.user).to.be.an('object');
      expect(res.body.user.name).to.be.an('string');
      expect(res.body.user.email).to.be.an('string');
      const sampleKey = 'samsto:sample:' + res.body.name.toLowerCase();
      return rcli.hgetallAsync(sampleKey)
      .then((sample) => {
        expect(sample.provider).to.be.an('string');
        const user = JSON.parse(sample.user);
        expect(user.name).to.be.an('string');
        expect(user.email).to.be.an('string');
        done();
      })
      .catch(done);
    });
  });
});
