/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/profiles/put.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/profiles';
const expect = require('chai').expect;
const adminProfile = require('../../../../config').db.adminProfile;
const Profile = tu.db.Profile;

describe('tests/api/v1/profiles/put.js >', () => {
  const ZERO = 0;
  const pname = `${tu.namePrefix}testProfile`;
  const newName = pname + '2';
  /* out of the box admin user token */
  const predefinedAdminUserToken = tu.createAdminToken();

  beforeEach((done) => {
    // Create profile __testProfile
    Profile.create({ name: pname })
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('Pass, PUT name & subjectAccess of an ordinary profile', (done) => {
    api.put(path + '/' + pname)
    .set('Authorization', predefinedAdminUserToken)
    .send({
      name: newName,
      subjectAccess: 'rw',
      roomTypeAccess: 'rw',
    })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(newName);
      expect(res.body.roomTypeAccess).to.equal('rw');
      done();
    });
  });

  it('Fail, Admin update forbidden', (done) => {
    api.put(path + '/' + adminProfile.name)
    .set('Authorization', predefinedAdminUserToken)
    .send({
      name: adminProfile.name,
      aspectAccess: 'r',
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.equal('AdminUpdateDeleteForbidden');
      done();
    });
  });

  it('Fail, name is a required field of PUT Profile', (done) => {
    api.put(path + '/' + pname)
    .set('Authorization', predefinedAdminUserToken)
    .send({
      subjectAccess: 'r',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.contain('SCHEMA_VALIDATION_FAILED');
      done();
    });
  });
});
