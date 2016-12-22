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
const User = tu.db.User;
const writersPath = '/v1/perspectives/{key}/writers';
const writerPath = '/v1/perspectives/{key}/writers/{userNameOrId}';

describe('api: perspectives: delete writer(s)', () => {
  let perspective;
  let token;
  let user;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    u.doSetup()
    .then((createdLens) => tu.db.Perspective.create({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLens.id,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature', 'humidity'],
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilter: ['Critical', '-OK'],
    }))
    .then((createdPersp) => {
      perspective = createdPersp;
    }).then(() =>

      /**
       * tu.createToken creates an user and an admin user is already created,
       * so one use of these.
       */
      User.findOne())
    .then((usr) => perspective.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      perspective.addWriter(secUsr);
      user = secUsr;
    })
    .then(() => done())
    .catch((err) => done(err));
  });


  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('remove write permission associated with the resource', (done) => {
    api.delete(writersPath.replace('{key}', perspective.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.NO_CONTENT)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }
      api.get(writersPath.replace('{key}', perspective.id))
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
