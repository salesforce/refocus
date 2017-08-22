/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /tests/db/model/profile/admin.js
 */
'use strict';
const conf = require('../../../../config');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const Profile = tu.db.Profile;

describe('tests/db/model/profile/admin.js >', () => {
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
      done();
    });
  });

  it('Admin profile exists', (done) => {
    expect(ap).to.have.property('id');
    done();
  });

  it('Cannot delete admin profile', (done) => {
    ap.destroy()
    .then(() => {
      done(new Error('Expecting AdminUpdateDeleteForbidden'));
    })
    .catch((err) => {
      expect(err.name).to.equal('AdminUpdateDeleteForbidden');
      done();
    });
  });

  it('Cannot update admin profile', (done) => {
    ap.update({ lensAccess: 'r' })
    .then(() => {
      done(new Error('Expecting AdminUpdateDeleteForbidden'));
    })
    .catch((err) => {
      expect(err.name).to.equal('AdminUpdateDeleteForbidden');
      done();
    });
  });

  it('Cannot create duplicate Admin profile', (done) => {
    Profile.create(conf.db.adminProfile)
    .then(() => {
      done(new Error('Expecting SequelizeUniqueConstraintError'));
    })
    .catch((err) => {
      expect(err.name).to.equal('SequelizeUniqueConstraintError');
      done();
    });
  });

  it('Cannot create duplicate Admin profile - case insensitive', (done) => {
    const p = conf.db.adminProfile;
    p.name = p.name.toLowerCase();
    Profile.create(p)
    .then(() => {
      done(new Error('Expecting SequelizeUniqueConstraintError'));
    })
    .catch((err) => {
      expect(err.name).to.equal('SequelizeUniqueConstraintError');
      done();
    });
  });
}); // Admin Profile tests
