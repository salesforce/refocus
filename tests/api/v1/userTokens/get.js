/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/userTokens/get.js
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

describe(`api: GET ${path}/U/tokens/T`, () => {
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
    .then((user) => {
      return Token.create({
        name: tname,
        createdBy: user.id,
      });
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('user and token found', (done) => {
    api.get(`${path}/${uname}/tokens/${tname}`)
    .set('Authorization', '???')
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

  it('user not found', (done) => {
    api.get(`${path}/who@what.com/tokens/foo`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.NOT_FOUND)
    .end(() => done());
  });

  it('user found but token name not found', (done) => {
    api.get(`${path}/${uname}/tokens/foo`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.NOT_FOUND)
    .end(() => done());
  });
});