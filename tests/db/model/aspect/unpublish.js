/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/aspect/unpublish.js
 */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const Profile = tu.db.Profile;
const User = tu.db.User;

describe('tests/db/model/aspect/unpublish.js >', () => {
  let asp;

  beforeEach((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect`,
      timeout: '30s',
      valueType: 'NUMERIC',
    })
    .then((a) => {
      asp = a;
      return Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject`,
      });
    })
    .then((subj) => Sample.create({ aspectId: asp.id, subjectId: subj.id }))
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('sample is deleted when aspect is unpublished', (done) => {
    asp.update({ isPublished: false })
    .then((a) => a.getSamples())
    .then((samples) => {
      expect(samples.length).to.equal(0);
      done();
    })
    .catch(done);
  });
});
