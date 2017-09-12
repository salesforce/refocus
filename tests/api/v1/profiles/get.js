/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/profiles/get.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/profiles';
const expect = require('chai').expect;
const Profile = tu.db.Profile;
const adminProfile = require('../../../../config').db.adminProfile;

describe('tests/api/v1/profiles/get.js >', () => {
  const pname = `${tu.namePrefix}1`;
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
    Profile.create({
      name: pname,
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('standard test profile found', (done) => {
    api.get(`${path}/${pname}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('name', pname);
      expect(res.body).to.have.property('aspectAccess', 'rw');
      expect(res.body).to.have.property('botAccess', 'rw');
      expect(res.body).to.have.property('eventAccess', 'rw');
      expect(res.body).to.have.property('lensAccess', 'rw');
      expect(res.body).to.have.property('perspectiveAccess', 'rw');
      expect(res.body).to.have.property('profileAccess', 'r');
      expect(res.body).to.have.property('roomAccess', 'rw');
      expect(res.body).to.have.property('roomTypeAccess', 'rw');
      expect(res.body).to.have.property('sampleAccess', 'rw');
      expect(res.body).to.have.property('subjectAccess', 'rw');
      expect(res.body).to.have.property('userAccess', 'rw');
      done();
    });
  });

  it('Admin profile found', (done) => {
    api.get(`${path}/${adminProfile.name}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('name', adminProfile.name);
      done();
    });
  });

  it('profiles array returned', (done) => {
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.be.instanceof(Array);
      done();
    });
  });

  it('Profile not found', (done) => {
    api.get(`${path}/who@what.com`)
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });
});
