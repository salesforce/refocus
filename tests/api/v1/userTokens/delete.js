/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/userTokens/delete.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/users';
const expect = require('chai').expect;
const Profile = tu.db.Profile;
const User = tu.db.User;
const Token = tu.db.Token;
const jwtUtil = require('../../../../utils/jwtUtil');
const adminUser = require('../../../../config').db.adminUser;

describe(`api: DELETE ${path}/U/tokens/T`, () => {
  const predefinedAdminUserToken = jwtUtil.createToken(
    adminUser.name, adminUser.name
  );
  const uname = `${tu.namePrefix}test@refocus.com`;
  const tname = `${tu.namePrefix}Voldemort`;

  before((done) => {
    Profile.create({
      name: `${tu.namePrefix}testProfile`,
    })
    .then((profile) =>
      User.create({
        profileId: profile.id,
        name: uname,
        email: uname,
        password: 'user123password',
      })
    )
    .then((user) => Token.create({
      name: tname,
      createdBy: user.id,
    }))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('admin user, user and token found', (done) => {
    api.delete(`${path}/${uname}/tokens/${tname}`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body).to.have.property('name', tname);
        expect(res.body.isDeleted).to.not.equal(0);
        done();
      }
    });
  });

  it('admin user, user not found', (done) => {
    api.delete(`${path}/who@what.com/tokens/foo`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(() => done());
  });

  it('admin user, user found but token name not found', (done) => {
    api.delete(`${path}/${uname}/tokens/foo`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(() => done());
  });

  it('not admin user, user found but token name not found', (done) => {
    api.delete(`${path}/${uname}/tokens/foo`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.FORBIDDEN)
    .end(() => done());
  });
});
