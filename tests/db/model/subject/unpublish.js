/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/unpublish.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const Sample = tu.db.Sample;

describe('db: subject: unpublish: ', () => {
  let sample;
  let subject;

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
    Aspect.create(aspectToCreate)
    .then((asp) => {
      aId = asp.id;
      return Subject.create(subjectToCreate);
    })
    .then((subj) => {
      subject = subj;
      return Sample.create({
        aspectId: aId,
        subjectId: subject.id,
      });
    })
    .then((samp) => {
      sample = samp;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);

  it('samples deleted', (done) => {
    Subject.findById(subject.id)
    .then((subj) => subj.update({ isPublished: false }))
    .then(() => Sample.findById(sample.id))
    .then((samp) => {
      expect(samp).to.equal(null);
      done();
    })
    .catch(done);
  });
});
