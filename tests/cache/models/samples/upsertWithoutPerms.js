/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/upsertWithoutPerms.js
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

const upsertPath = '/v1/samples/upsert';
const bulkUpsertPath = '/v1/samples/upsert/bulk';
describe('api: upsert samples without perms', () => {
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

  let aspect;
  let subject;
  let otherValidToken;
  let user;
  before((done) => {
    tu.toggleOverride('enforceWritePermission', true);
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then(() => done())
    .catch(done);
  });

  before((done) => {
    Aspect.create(asp)
    .then((a) => {
      aspect = a;
      return Subject.create(sub);
    })
    .then((s) => {
      subject = s;
    })
    .then(() => {
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
    })
    .then(() => samstoinit.eradicate())
    .then(() => samstoinit.populate())
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDelete);
  after(rtu.flushRedis);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));
  after(() => tu.toggleOverride('enforceWritePermission', false));

  after(tu.forceDeleteUser);


  it('upsert should fail when upserting a sample ' +
    'for an aspect without permission', (done) => {
    api.post(upsertPath)
    .set('Authorization', otherValidToken)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
      value: '2',
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err /* , res*/) => {
      return err ? done(err) : done();
    });
  });

  it('upsert should fail when upserting a sample for an aspect without ' +
    'permission, even if the request has aspect in uppercase', (done) => {
    const upperCaseName = aspect.name.toUpperCase();
    api.post(upsertPath)
    .set('Authorization', otherValidToken)
    .send({
      name: `${subject.absolutePath}|${upperCaseName}`,
      value: '2',
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err /* , res*/) => {
      return err ? done(err) : done();
    });
  });

  it('upsert should fail when upserting a sample for an aspect without ' +
    'permission even if the aspect name is Uppercase', (done) => {
    api.post(upsertPath)
    .set('Authorization', otherValidToken)
    .send({
      name: `${subject.absolutePath}|${aspUPPERCASE.name}`,
      value: '2',
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err /* , res*/) => {
      return err ? done(err) : done();
    });
  });

  it('bulk upsert should return OK for operations with any' +
    ' permission', (done) => {
    api.post(bulkUpsertPath)
    .set('Authorization', otherValidToken)
    .send([{
      name: `${subject.absolutePath}|${aspect.name}`,
      value: '2',
    }])
    .expect(constants.httpStatus.OK)
    .end((err /* , res*/) => {
      return err ? done(err) : done();
    });
  });
});
