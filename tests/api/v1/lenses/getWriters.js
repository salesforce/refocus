/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/lenses/getWriters.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const User = tu.db.User;
const getWritersPath = '/v1/lenses/{key}/writers';

describe('api: lenses: get writers}', () => {
  let lens;
  let token;

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
    .then((lensInst) => {
      lens = lensInst;
    }).then(() =>

      /**
       * tu.createToken creates an user and an admin user is already created,
       * so one use of these.
       */
      User.findOne())
    .then((usr) =>
      lens.addWriter(usr))
    .then(() =>
      tu.createSecondUser())
    .then((secUsr) =>
      lens.addWriter(secUsr))
    .then(() => done())
    .catch((err) => done(err));
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('find Writers that have writer permission' +
      'associated with the model', (done) => {
    api.get(getWritersPath.replace('{key}', lens.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(2);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('find Writers and make sure they are sorted by username', (done) => {
    api.get(getWritersPath.replace('{key}', lens.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(2);
      const firstUserName = res.body[0].name;
      const secondUserName = res.body[1].name;
      expect(firstUserName < secondUserName).to.equal(true);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});
