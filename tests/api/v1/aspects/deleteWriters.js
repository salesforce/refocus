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
const Aspect = tu.db.Aspect;
const User = tu.db.User;
const writersPath = '/v1/aspects/{key}/writers';
const writerPath = '/v1/aspects/{key}/writers/{userNameOrId}';

describe('api: aspects: delete writer(s)', () => {
  let token;
  let aspect;
  let user;
  const aspectToCreate = {
    name: `${tu.namePrefix}ASPECTNAME`,
    timeout: '110s',
  };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    Aspect.create(aspectToCreate)
    .then((asp) => {
      aspect = asp;
    }).then(() =>

      /**
       * tu.createToken creates an user and an admin user is already created,
       * so one use of these.
       */
      User.findOne())
    .then((usr) => aspect.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      aspect.addWriter(secUsr);
      user = secUsr;
    })
    .then(() => done())
    .catch((err) => done(err));
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);

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
});
