/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/aspects/postWriters.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const rcli = rtu.rcli;
const samstoinit = rtu.samstoinit;
const sampleStore = rtu.sampleStore;
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const User = tu.db.User;
const postWritersPath = '/v1/aspects/{key}/writers';

describe('tests/cache/models/aspects/postWriters.js, ' +
'api: aspects: post writers', () => {
  let token;
  let aspect;
  let firstUser;
  let secondUser;
  let otherValidToken;
  const userNameArray = [];
  const aspectToCreate = {
    name: `${tu.namePrefix}ASPECTNAME`,
    timeout: '110s',
    isPublished: true,
    tags: ['tag1'],
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

  before((done) => {
    Aspect.create(aspectToCreate)
    .then((asp) => {
      aspect = asp;
    })
    /*
     * tu.createToken creates a user and an admin user is already created so
     * use one of these.
     */
    .then(() => User.findOne({ where: { name: tu.userName } }))
    .then((usr) => {
      firstUser = usr;
      userNameArray.push(firstUser.name);
      return tu.createSecondUser();
    })
    .then((secUsr) => {
      secondUser = secUsr;
      userNameArray.push(secondUser.name);
      return tu.createThirdUser();
    })
    .then((tUsr) => tu.createTokenFromUserName(tUsr.name))
    .then((tkn) => {
      otherValidToken = tkn;
      return samstoinit.populate();
    })
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDelete);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));
  after(tu.forceDeleteUser);

  it('add writers to the record and make sure the writers are associated ' +
  'with the right object', (done) => {
    api.post(postWritersPath.replace('{key}', aspect.id))
    .set('Authorization', token)
    .send(userNameArray)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body).to.have.length(2);
      const userOne = res.body[0];
      const userTwo = res.body[1];
      expect(userOne.aspectId).to.not.equal(undefined);
      expect(userOne.userId).to.not.equal(undefined);
      expect(userTwo.aspectId).to.not.equal(undefined);
      expect(userTwo.userId).to.not.equal(undefined);

      // make sure the writers are added to the aspect in redis too
      rcli.hgetallAsync('samsto:aspect:___aspectname')
      .then((asp) => {
        sampleStore.arrayObjsStringsToJson(asp,
          sampleStore.constants.fieldsToStringify.aspect);
        expect(asp.writers.length).to.equal(2);
        expect(asp.writers).to.have
        .members([firstUser.name, secondUser.name]);
      });
    })
    .end(done);
  });

  it('return 403 for adding writers using an user that is not already a ' +
  'writer of that resource', (done) => {
    api.post(postWritersPath.replace('{key}', aspect.id))
    .set('Authorization', otherValidToken)
    .send(userNameArray)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('return 404 for adding writers to an invalid aspect', (done) => {
    api.post(postWritersPath.replace('{key}', 'invalidAspect'))
    .set('Authorization', otherValidToken)
    .send(userNameArray)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });

  it('a request body that is not an array should not be accepted', (done) => {
    const firstUserName = firstUser.name;
    api.post(postWritersPath.replace('{key}', aspect.id))
    .set('Authorization', token)
    .send({ firstUserName })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });

  it('return 404 for adding writers to an array not found in the cache',
  (done) => {
    samstoinit.eradicate()
    .then(() => {
      api.post(postWritersPath.replace('{key}', aspect.id))
      .set('Authorization', token)
      .send(userNameArray)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });
  });
});
