/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generatorTemplates/deleteWriters.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const User = tu.db.User;
const writersPath = '/v1/generatorTemplates/{key}/writers';
const writerPath = '/v1/generatorTemplates/{key}/writers/{userNameOrId}';

describe('tests/api/v1/generatorTemplates/deleteWriters.js > ', () => {
  let token;
  let otherValidToken;
  let generatorTemplate;
  let user;
  const generatorTemplateToCreate = u.getGeneratorTemplate();

  beforeEach((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      return done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    GeneratorTemplate.create(generatorTemplateToCreate)
    .then((gen) => {
      generatorTemplate = gen;
    })
    .then(() => User.findOne({ where: { name: tu.userName } }))
    .then((usr) => generatorTemplate.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      generatorTemplate.addWriter(secUsr);
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

  describe('delete writer(s) > ', () => {
    it('remove write permission using username', (done) => {
      api.delete(writerPath.replace('{key}', generatorTemplate.id)
      .replace('{userNameOrId}', user.name))
      .set('Authorization', token)
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(writersPath.replace('{key}', generatorTemplate.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(1);
        })
        .end(done);
      });
    });

    it('remove write permission using user id', (done) => {
      api.delete(writerPath.replace('{key}', generatorTemplate.id)
      .replace('{userNameOrId}', user.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.NO_CONTENT)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(writersPath.replace('{key}', generatorTemplate.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(1);
        })
        .end(done);
      });
    });

    it('Write permissions should not be effected for invalid user', (done) => {
      api.delete(writerPath.replace('{key}', generatorTemplate.id)
      .replace('{userNameOrId}', 'invalidUserName'))
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        api.get(writersPath.replace('{key}', generatorTemplate.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.have.length(2);
        })
        .end(done);
      });
    });

    it('403 deleting a writer using a token generated for a user not already' +
      'in the list of writers', (done) => {
      api.delete(writerPath.replace('{key}', generatorTemplate.id)
      .replace('{userNameOrId}', 'invalidUserName'))
      .set('Authorization', otherValidToken)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });
  });
});

