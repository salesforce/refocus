/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/deleteWriters.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Subject = tu.db.Subject;
const User = tu.db.User;
const writersPath = '/v1/subjects/{key}/writers';
const writerPath = '/v1/subjects/{key}/writers/{userNameOrId}';
const subjectPath = '/v1/subjects/{key}';

describe('api: subject: permissions', () => {
  let token;
  let subject;
  let user;
  let otherValidToken;

  const subjectToCreate = {
    name: `${tu.namePrefix}NorthAmerica2`,
    description: 'continent',
  };

  beforeEach((done) => {
    tu.toggleOverride('enforceWritePermission', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  beforeEach((done) => {
    Subject.create(subjectToCreate)
    .then((sub) => {
      subject = sub;
    }).then(() =>

     /**
       * tu.createToken creates an user and an admin user is already created,
       * so one use of these.
       */
      User.findOne({ where: { name: tu.userName } }))
    .then((usr) => subject.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      subject.addWriter(secUsr);
      user = secUsr;
    })
    .then(() => tu.createThirdUser())
    .then((tUsr) => tu.createTokenFromUserName(tUsr.name))
    .then((tkn) => {
      otherValidToken = tkn;
    })
    .then(() => done())
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);
  afterEach(tu.forceDeleteUser);

  describe('delete resource without permission', () => {
    it('return 403 when deleting aspect without permission', (done) => {
      api.delete(subjectPath.replace('{key}', subject.id))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });
  });

  describe('delete writer(s)', () => {
    it('remove write permission associated with the resource', (done) => {
      api.delete(writersPath.replace('{key}', subject.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(writersPath.replace('{key}', subject.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.have.length(0);
      })
      .end((_err /* , res */) => {
        if (_err) {
          return done(_err);
        }

        return done();
      });
        return null;
      });
    });

    it('return 403 when a token is not passed to the header', (done) => {
      api.delete(writersPath.replace('{key}', subject.id))
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });

    it('return 403 when deleteting writers using a token ' +
      'generated for a user not already in the list of writers', (done) => {
      api.delete(writersPath.replace('{key}', subject.id))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });


    it('remove write permission using username', (done) => {
      api.delete(writerPath.replace('{key}', subject.id)
        .replace('{userNameOrId}', user.name))
      .set('Authorization', token)
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(writersPath.replace('{key}', subject.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.have.length(1);
      })
      .end((_err /* , res */) => {
        if (_err) {
          return done(_err);
        }

        return done();
      });
        return null;
      });
    });

    it('remove write permission using user id', (done) => {
      api.delete(writerPath.replace('{key}', subject.id)
        .replace('{userNameOrId}', user.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(writersPath.replace('{key}', subject.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.have.length(1);
      })
      .end((_err /* , res */) => {
        if (_err) {
          return done(_err);
        }

        return done();
      });
        return null;
      });
    });

    it('Write permissions should not be effected for invalid user', (done) => {
      api.delete(writerPath.replace('{key}', subject.id)
        .replace('{userNameOrId}', 'invalidUserName'))
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(writersPath.replace('{key}', subject.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.have.length(2);
      })
      .end((_err /* , res */) => {
        if (_err) {
          return done(_err);
        }

        return done();
      });
        return null;
      });
    });

    it('return 403 when deleteting a writer using a token ' +
      'generated for a user not already in the list of writers', (done) => {
      api.delete(writerPath.replace('{key}', subject.id)
        .replace('{userNameOrId}', 'invalidUserName'))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });

    it('return 404 when trying to delete an invalidResource', (done) => {
      api.delete(writersPath.replace('{key}', 'invalidResource'))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });
  });
});
