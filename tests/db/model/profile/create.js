/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /tests/db/model/profile/create.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Profile = tu.db.Profile;

describe('tests/db/model/profile/create.js >', () => {
  const pname = `${tu.namePrefix}1`;

  afterEach(u.forceDelete);

  describe('Create a new profile', () => {
    const pname = `${tu.namePrefix}1`;

    it('ok, default profile created', (done) => {
      Profile.create({
        name: pname,
      })
      .then((o) => {
        expect(o).to.have.property('name').to.equal(pname);
        expect(o).to.have.property('aspectAccess').to.equal('rw');
        expect(o).to.have.property('botAccess').to.equal('rw');
        expect(o).to.have.property('collectorAccess', 'r');
        expect(o).to.have.property('eventAccess').to.equal('rw');
        expect(o).to.have.property('generatorAccess', 'r');
        expect(o).to.have.property('generatorTemplateAccess', 'r');
        expect(o).to.have.property('lensAccess').to.equal('rw');
        expect(o).to.have.property('perspectiveAccess').to.equal('rw');
        expect(o).to.have.property('profileAccess').to.equal('r');
        expect(o).to.have.property('roomAccess').to.equal('rw');
        expect(o).to.have.property('roomTypeAccess').to.equal('rw');
        expect(o).to.have.property('sampleAccess').to.equal('rw');
        expect(o).to.have.property('subjectAccess').to.equal('rw');
        expect(o).to.have.property('userAccess').to.equal('rw');
        done();
      })
      .catch(done);
    });
  });

  it('ok, subjectAccess rw', (done) => {
    Profile.create({
      name: pname,
      subjectAccess: 'rw',
    })
    .then((o) => {
      expect(o).to.have.property('name', pname);
      expect(o).to.have.property('subjectAccess', 'rw');
      done();
    })
    .catch(done);
  });

  it('Fail, profile name missing', (done) => {
    Profile.create({
      subjectAccess: 'rw',
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase()).to.contain('name cannot be null');
      done();
    })
    .catch(done);
  });

  it('Fail, profile name cannot be an array', (done) => {
    Profile.create({
      name: [pname],
    })
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message.toLowerCase())
      .to.contain('name cannot be an array or an object');
      done();
    })
    .catch(done);
  });

  it('returns correct profile access field name', (done) => {
    expect(Profile.getProfileAccessField()).to.equal('profileAccess');
    done();
  });
});
