/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/users/get.js
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

describe(`api: GET ${path}`, () => {
  const uname = `${tu.namePrefix}test@refocus.com`;
  const tname = `${tu.namePrefix}Voldemort`;
  let userId = '';

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
      userId = user.id;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);

  it('does not return default token', (done) => {
    api.get(`${path}/${uname}`)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      Token.findOne({ where: { name: uname, createdBy: userId } })
      .then((tobj) => {
        if (tobj) {
          done(new Error('Default token should not be returned'));
        }

        done();
      })
      .catch((err1) => done(err1));
    });
  });

  it('user found', (done) => {
    api.get(`${path}/${uname}`)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body).to.have.property('name', uname);
      expect(res.body).to.not.have.property('password');
      expect(res.body.isDeleted).to.not.equal(0);
      done();
    });
  });

  it('users array returned', (done) => {
    api.get(`${path}`)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body).to.be.instanceof(Array);
      expect(res.body[0]).to.not.have.property('password');
      done();
    });
  });

  it('user not found', (done) => {
    api.get(`${path}/who@what.com`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.NOT_FOUND)
    .end(() => done());
  });
});
