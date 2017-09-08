/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/deleteWriters.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Collector = tu.db.Collector;
const User = tu.db.User;
const path = '/v1/collectors/{key}/writers';
const writerPath = '/v1/collectors/{key}/writers/{userNameOrId}';

describe('tests/api/v1/collectors/deleteWriters.js >', () => {
  let token;
  let otherValidToken;
  let coll;
  let user;

  beforeEach((done) => {
    tu.toggleOverride('enforceWritePermission', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Collector.create(u.toCreate)
    .then((c) => {
      coll = c;
    })
    .then(() => User.findOne({ where: { name: tu.userName } }))
    .then((usr) => coll.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      coll.addWriter(secUsr);
      user = secUsr;
    })
    .then(() => tu.createThirdUser())
    .then((tUsr) => tu.createTokenFromUserName(tUsr.name))
    .then((tkn) => {
      otherValidToken = tkn;
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);
  afterEach(tu.forceDeleteUser);

  describe('without permission >', () => {
    it('return 403 when deleting without permission', (done) => {
      api.delete(path.replace('{key}', coll.id))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });
  });

  describe('delete writer(s) >', () => {
    it('remove write permission associated with the resource', (done) => {
      api.delete(path.replace('{key}', coll.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(path.replace('{key}', coll.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(0);
        })
        .end(done);
      });
    });

    it('return 403 when a token is not passed to the header', (done) => {
      api.delete(path.replace('{key}', coll.id))
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });

    it('return 403 when deleteting writers using a token generated for ' +
    'a user not already in the list of writers', (done) => {
      api.delete(path.replace('{key}', coll.id))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });

    it('remove write permission using username', (done) => {
      api.delete(writerPath.replace('{key}', coll.id)
        .replace('{userNameOrId}', user.name))
      .set('Authorization', token)
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(path.replace('{key}', coll.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(1);
        })
        .end(done);
      });
    });

    it('remove write permission using user id', (done) => {
      api.delete(writerPath.replace('{key}', coll.id)
        .replace('{userNameOrId}', user.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(path.replace('{key}', coll.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(1);
        })
        .end(done);
      });
    });

    it('Write permissions should not be effected for invalid user', (done) => {
      api.delete(writerPath.replace('{key}', coll.id)
        .replace('{userNameOrId}', 'invalidUserName'))
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(path.replace('{key}', coll.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(2);
        })
        .end(done);
      });
    });

    it('return 403 when deleteting a writer using a token ' +
    'generated for a user not already in the list of writers', (done) => {
      api.delete(writerPath.replace('{key}', coll.id)
        .replace('{userNameOrId}', 'invalidUserName'))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });

    it('return 404 when trying to delete an invalidResource', (done) => {
      api.delete(path.replace('{key}', 'invalidResource'))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });
  });
});
