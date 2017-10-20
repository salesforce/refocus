/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/aspects/deleteWriters.js
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
const writersPath = '/v1/aspects/{key}/writers';
const writerPath = '/v1/aspects/{key}/writers/{userNameOrId}';
const aspectPath = '/v1/aspects/{key}';

describe('tests/cache/models/aspects/deleteWriters.js, ' +
'api: aspects: permissions >', () => {
  let token;
  let otherValidToken;
  let aspect;
  let user;
  const aspectToCreate = {
    name: `${tu.namePrefix}ASPECTNAME`,
    timeout: '110s',
    isPublished: true,
  };

  beforeEach((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Aspect.create(aspectToCreate)
    .then((asp) => {
      aspect = asp;
    })
    /*
     * tu.createToken creates a user and an admin user is already created so
     * use one of these.
     */
    .then(() => User.findOne({ where: { name: tu.userName } }))
    .then((usr) => aspect.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      aspect.addWriter(secUsr);
      user = secUsr;
    })
    .then(() => tu.createThirdUser())
    .then((tUsr) => tu.createTokenFromUserName(tUsr.name))
    .then((tkn) => {
      otherValidToken = tkn;
      return samstoinit.populate();
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(rtu.forceDelete);
  afterEach(tu.forceDeleteUser);

  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  describe('delete resource without permission >', () => {
    it('return 403 when deleting aspect without permission', (done) => {
      api.delete(aspectPath.replace('{key}', aspect.id))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });
  });

  describe('delete writer(s) >', () => {
    it('remove write permission associated with the resource', (done) => {
      api.delete(writersPath.replace('{key}', aspect.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(writersPath.replace('{key}', aspect.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(0);

          // make sure the writers are added to the aspect in redis too
          rcli.hgetallAsync('samsto:aspect:___aspectname')
          .then((asp) => {
            sampleStore.arrayObjsStringsToJson(asp,
              sampleStore.constants.fieldsToStringify.aspect);
            expect(asp.writers.length).to.equal(0);
          });
        })
        .end(done);
      });
    });

    it('return 403 when a token is not passed to the header', (done) => {
      api.delete(writersPath.replace('{key}', aspect.id))
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });

    it('return 404 deleting writers for an aspect not in the system',
    (done) => {
      api.delete(writersPath.replace('{key}', 'InvalidAspect'))
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });

    it('return 403 when deleteting writers using a token generated for ' +
    'a user not already in the list of writers', (done) => {
      api.delete(writersPath.replace('{key}', aspect.id))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });

    it('return 404 when deleteting writers for an aspect not ' +
      'found in the cache', (done) => {
      samstoinit.eradicate()
      .then(() => {
        api.delete(writersPath.replace('{key}', aspect.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.NOT_FOUND)
        .end(done);
      });
    });

    it('remove write permission using username', (done) => {
      api.delete(writerPath.replace('{key}', aspect.id)
        .replace('{userNameOrId}', user.name))
      .set('Authorization', token)
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(writersPath.replace('{key}', aspect.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(1);
        })
        .end(done);
      });
    });

    it('remove write permission using user id', (done) => {
      api.delete(writerPath.replace('{key}', aspect.id)
        .replace('{userNameOrId}', user.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(writersPath.replace('{key}', aspect.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(1);

          // make sure the
          rcli.hgetallAsync('samsto:aspect:___aspectname')
          .then((asp) => {
            sampleStore.arrayObjsStringsToJson(asp,
              sampleStore.constants.fieldsToStringify.aspect);
            expect(asp.writers.length).to.equal(1);
          });
        })
        .end(done);
      });
    });

    it('Write permissions should not be effected for invalid user', (done) => {
      api.delete(writerPath.replace('{key}', aspect.id)
        .replace('{userNameOrId}', 'invalidUserName'))
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(writersPath.replace('{key}', aspect.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(2);
        })
        .end(done);
      });
    });

    it('return 403 when deleteting a writer using a token generated for a ' +
    'user not already in the list of writers', (done) => {
      api.delete(writerPath.replace('{key}', aspect.id)
        .replace('{userNameOrId}', 'invalidUserName'))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });

    it('return 404 when trying to delete an invalidResource', (done) => {
      api.delete(writerPath.replace('{key}', 'invalidResource'))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });

    it('return 404 when deleteting writer for an aspect not found in the ' +
    'cache', (done) => {
      samstoinit.eradicate()
      .then(() => {
        api.delete(writerPath.replace('{key}', aspect.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.NOT_FOUND)
        .end(done);
      });
    });
  });
});
