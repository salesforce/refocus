/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/profile/withoutUser.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Profile = tu.db.Profile;

describe('tests/db/model/profile/withoutUser.js >', () => {
  let p = {};

  beforeEach((done) => {
    Profile.create({ name: `${tu.namePrefix}1` })
    .then((createdProfile) => {
      p = createdProfile;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('Expect to throw error, if set an access field to invalid string');

  it('Expect to throw error, if set an access field to object');

  it('Expect to throw error, if set an access field to number');

  it('Expect to throw error, if set userCount');

  it('Newly created profile, includes expected fields');

  it('Get deleted profile by id, should return null, if find with paranoid ' +
  'true', (done) => {
    p.destroy()
    .then(() => Profile.findOne({
      where: { id: p.id },
      paranoid: true,
    }))
    .then((foundProfile) => {
      expect(foundProfile).to.equal(null);
      done();
    })
    .catch(done);
  });

  it('Get deleted profile by id, should return null, if find with paranoid ' +
  'false', (done) => {
    p.destroy()
    .then(() => Profile.findOne({
      where: { id: p.id },
      paranoid: false,
    }))
    .then((foundProfile) => {
      expect(!foundProfile);
      done();
    })
    .catch(done);
  });

  it('Get deleted profile by id, should return null', (done) => {
    p.destroy()
    .then(() => Profile.findByPk(p.id))
    .then((foundProfile) => {
      expect(foundProfile).to.equal(null);
      done();
    })
    .catch(done);
  });

  it('Deleting profile without children, deletes successfully, and returns ' +
  'deleted profile', (done) => {
    p.destroy()
    .then((destroyedProfile) => {
      expect(destroyedProfile.dataValues.name).to.equal(p.name);
      done();
    })
    .catch(done);
  });
});
