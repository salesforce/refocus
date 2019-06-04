/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/sample/delete.js
 */
'use strict'; // eslint-disable-line strict
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

describe('tests/db/model/sample/delete.js >', () => {
  let sample;

  const aspectToCreate = {
    isPublished: true,
    name: `${tu.namePrefix}Aspect`,
    timeout: '30s',
    valueType: 'NUMERIC',
  };

  const subjectToCreate = {
    isPublished: true,
    name: `${tu.namePrefix}Subject`,
  };

  before((done) => {
    let aId;
    let sId;
    Aspect.create(aspectToCreate)
    .then((asp) => {
      aId = asp.id;
      return Subject.create(subjectToCreate);
    })
    .then((subj) => {
      sId = subj.id;
      return Sample.create({
        aspectId: aId,
        subjectId: sId,
      });
    })
    .then((samp) => {
      sample = samp;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  it('no isDeleted and deletedAt fields in Sample Model', (done) => {
    Sample.findByPk(sample.id)
    .then((samp) => {
      expect(samp.dataValues).to.not.have.any.keys('isDeleted', 'deletedAt');
      done();
    })
    .catch(done);
  });
  it('samples should not be found after destory is called', (done) => {
    Sample.findByPk(sample.id)
    .then((samp) => samp.destroy())
    .then((o) => {
      expect(o).to.have.length(0);
      return Sample.findByPk(sample.id);
    })
    .then((o) => {
      expect(o).to.equal(null);
      done();
    })
    .catch(done);
  });
});
