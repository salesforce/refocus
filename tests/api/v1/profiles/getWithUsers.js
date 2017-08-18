/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/profiles/getWithUsers.js
 */
'use strict';
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Profile = tu.db.Profile;
const User = tu.db.User;
const path = '/v1/profiles';

describe('tests/api/v1/profiles/getWithUsers.js (with users) >', () => {
  let pid;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Profile.create({ name: `${tu.namePrefix}1` })
    .then((profile) => {
      pid = profile.id;
      return User.create({
        profileId: pid,
        name: tu.namePrefix + 1,
        email: 'hello@world.com',
        password: 'fgrefwgdrsefdfeafs',
      });
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('get a profile with fields users returns array of length 1', (done) => {
    api.get(`${path}/${pid}?fields=users`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => expect(res.body.users.length).to.be.equal(1))
    .end(done);
  });

  it('get profile with userCount returns userCount, value 1', (done) => {
    api.get(`${path}/${pid}?fields=userCount`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.userCount).to.be.equal(1);
    })
    .end(done);
  });
});
