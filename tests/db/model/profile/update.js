/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/profile/update.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Profile = tu.db.Profile;
const adminProfile = require('../../../../config').db.adminProfile;

describe('tests/db/model/profile/update.js >', () => {
  const pname = `${tu.namePrefix}1`;

  beforeEach((done) => {
    Profile.create({
      name: pname,
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, profile subjectAccess updated', (done) => {
    Profile.findOne({ where: { name: pname } })
    .then((o) => o.update({ subjectAccess: 'rw' }))
    .then(() => Profile.findOne({ where: { name: pname } }))
    .then((o) => {
      expect(o).to.have.property('subjectAccess').to.equal('rw');
      done();
    })
    .catch(done);
  });

  it('fail, profile aspectAccess bad', (done) => {
    Profile.findOne({ where: { name: pname } })
    .then((o) => o.update({ aspectAccess: true }))
    .then(() => Profile.findOne({ where: { name: pname } }))
    .catch((err) => {
      expect(err.name).to.equal(tu.dbErrorName);
      done();
    })
    .catch(done);
  });

  it('fail, profile aspectAccess bad', (done) => {
    Profile.findOne({ where: { name: pname } })
    .then((o) => o.update({ aspectAccess: true }))
    .catch((err) => {
      expect(err.name).to.equal(tu.dbErrorName);
      done();
    })
    .catch(done);
  });

  it('fail, admin profile cannot be changed', (done) => {
    Profile.findOne({
      where: {
        name: {
          $iLike: adminProfile.name,
        },
      },
    })
    .then((o) => o.update({ aspectAccess: 'r' }))
    .catch((err) => {
      expect(err.name).to.equal('AdminUpdateDeleteForbidden');
      done();
    })
    .catch(done);
  });
});
