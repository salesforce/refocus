/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/tokens/delete.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/tokens';
const expect = require('chai').expect;
const Profile = tu.db.Profile;
const User = tu.db.User;
const Token = tu.db.Token;
const jwtUtil = require('../../../../utils/jwtUtil');
const adminUser = require('../../../../config').db.adminUser;

describe(`api: DELETE ${path}`, () => {
  const predefinedAdminUserToken = jwtUtil.createToken(
    adminUser.name, adminUser.name
  );
  let usr;
  let tid;

  before((done) => {
    Profile.create({
      name: `${tu.namePrefix}testProfile`,
    })
    .then((profile) =>
      User.create({
        profileId: profile.id,
        name: `${tu.namePrefix}test@refocus.com`,
        email: `${tu.namePrefix}test@refocus.com`,
        password: 'user123password',
      })
    )
    .then((user) => {
      usr = user;
      return Token.create({
        name: `${tu.namePrefix}Voldemort`,
        createdBy: usr.id,
      });
    })
    .then((token) => {
      tid = token.id;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);

  it('admin user, found', (done) => {
    api.delete(`${path}/${tid}`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body).to.have.property('name',
          `${tu.namePrefix}Voldemort`);
        done();
      }
    });
  });

  it('admin user, not found', (done) => {
    api.delete(`${path}/123-abc`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(() => done());
  });

  it('invalid token', (done) => {
    api.delete(`${path}/${tid}`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });
});
