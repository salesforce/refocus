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
const getWriterPath = '/v1/lenses/{key}/writers/{userNameOrId}';

describe('api: lenses: get writers}', () => {
  let lens;
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
    .then((secUsr) => {
      lens.addWriter(secUsr);
      user = secUsr;
    })
    .then(() => done())
    .catch((err) => done(err));
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('find Writers that have write permission' +
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

  it.skip('find Writers and make sure the passwords are not returned', (done) => {
    api.get(getWritersPath.replace('{key}', lens.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      const firstUser = res.body[0];
      const secondUser = res.body[1];

      expect(firstUser.password).to.equal(undefined);
      expect(secondUser.password).to.equal(undefined);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('find Writer by username', (done) => {
    api.get(getWriterPath.replace('{key}', lens.name)
      .replace('{userNameOrId}', user.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(1);
      expect(res.body[0].name).to.contain('User');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('find Writer by userId', (done) => {
    api.get(getWriterPath.replace('{key}', lens.name)
      .replace('{userNameOrId}', user.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(1);
      expect(res.body[0].name).to.contain('User');
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('Writer not found for invalid username', (done) => {
    api.get(getWriterPath.replace('{key}', lens.name)
      .replace('{userNameOrId}', 'invalidUser'))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});
