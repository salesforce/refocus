/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /tests/db/model/user/admin.js
 */
'use strict';
const conf = require('../../../../config');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const Profile = tu.db.Profile;
const User = tu.db.User;

describe('tests/db/model/user/admin.js, Admin User Tests >', () => {
  let au = null;
  let ap = null;

  before((done) => {
    Profile.findOne({
      where: {
        name: {
          $iLike: conf.db.adminProfile.name,
        },
      },
    })
    .then((found) => {
      ap = found;
      return;
    })
    .then(() => User.findOne({
      where: {
        name: {
          $iLike: conf.db.adminUser.name,
        },
      },
    }))
    .then((found) => {
      au = found;
      done();
    });
  });

  it('Admin user exists', (done) => {
    expect(au).to.have.property('id');
    done();
  });

  it('Cannot create duplicate Admin user', (done) => {
    const a = conf.db.adminUser;
    a.profileId = ap.id;
    User.create(a)
    .then(() => done(new Error('Expecting SequelizeUniqueConstraintError')))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeUniqueConstraintError');
      done();
    });
  });

  it('Cannot create duplicate Admin user - case insensitive', (done) => {
    const a = conf.db.adminUser;
    a.name = conf.db.adminUser.name.toUpperCase();
    a.profileId = ap.id;
    User.create(a)
    .then(() => done(new Error('Expecting SequelizeUniqueConstraintError')))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeUniqueConstraintError');
      done();
    });
  });

  it('Cannot delete the out-of-the-box admin user', (done) => {
    au.destroy()
    .then(() => done(new Error('Expecting AdminUpdateDeleteForbidden')))
    .catch((err) => {
      expect(err.name).to.equal('AdminUpdateDeleteForbidden');
      done();
    });
  });

  it('Cannot change profile of the out-of-the-box admin user', (done) => {
    Profile.create({ name: `${tu.namePrefix}Profile` })
    .then((p) => au.update({ profileId: p.id }))
    .then(() => done(new Error('Expecting AdminUpdateDeleteForbidden')))
    .catch((err) => {
      expect(err.name).to.equal('AdminUpdateDeleteForbidden');
      done();
    });
  });
}); // Admin User tests
