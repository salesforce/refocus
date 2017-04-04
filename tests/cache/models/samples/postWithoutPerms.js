/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/postWithoutPerms.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const samstoinit = require('../../../../cache/sampleStoreInit');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const User = tu.db.User;

const postPath = '/v1/samples';
describe('api: post samples without perms', () => {
  const sub = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  const asp = {
    name: 'temperature',
    timeout: '30s',
    isPublished: true,
    rank: 10,
  };
  const aspUPPERCASE = {
    name: 'HUMIDITY',
    timeout: '30s',
    isPublished: true,
    rank: 10,
  };
  const sampleToPost = { value: '1' };
  let aspect;
  let otherValidToken;
  let user;
  before((done) => {
    tu.toggleOverride('enforceWritePermission', true);
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then(() => {
      done();
    })
    .catch(done);
  });

  before((done) => {
    Aspect.create(asp)
    .then((a) => {
      aspect = a;
      return Subject.create(sub);
    })
    .then((s) => {
      sampleToPost.subjectId = s.id;
      sampleToPost.aspectId = aspect.id;
      return User.findOne({ where: { name: tu.userName } });
    })
    .then((usr) => {
      user = usr;
      return aspect.addWriter(usr);
    })
    .then(() => Aspect.create(aspUPPERCASE))
    .then((_asp) => {
      return _asp.addWriter(user);
    })
    .then(() => tu.createUser('myUNiqueUser'))
    .then((_usr) => tu.createTokenFromUserName(_usr.name))
    .then((tkn) => {
      otherValidToken = tkn;
      return samstoinit.populate();
    })
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDelete);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));
  after(() => tu.toggleOverride('enforceWritePermission', false));

  after(tu.forceDeleteUser);


  it('sample write permission should be ' +
    'tied to permission on aspect', (done) => {
    api.post(postPath)
    .set('Authorization', otherValidToken)
    .send(sampleToPost)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err /* , res*/) => {
      return err ? done(err) : done();
    });
  });
});
