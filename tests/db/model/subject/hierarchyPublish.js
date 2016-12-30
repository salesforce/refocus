/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/hierarchyPublish.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const Sample = tu.db.Sample;

describe('db: subject: get hierarchy: ', () => {
  const par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  const chi = { name: `${tu.namePrefix}Canada`, isPublished: true };
  const grn = { name: `${tu.namePrefix}Quebec`, isPublished: true };

  const otherChi = { name: `${tu.namePrefix}UnitedStates`, isPublished: true };

  let ipar = 0;
  let ichi = 0;
  let igrn;
  let otherChildId;

  const samp = { value: 10 };

  const humidity = {
    name: `${tu.namePrefix}humidity`,
    timeout: '60s',
    isPublished: true,
  };

  beforeEach((done) => {
    Subject.create(par)
    .then((subj) => {
      ipar = subj.id;
      otherChi.parentId = subj.id;
      chi.parentId = ipar;
      return Subject.create(chi);
    })
    .then((subj) => {
      ichi = subj.id;
      grn.parentId = ichi;
      return Subject.create(grn);
    })
    .then((subj) => {
      igrn = subj.id;
      return Subject.create(otherChi);
    })
    .then((subj) => {
      otherChildId = subj.id;
      return Aspect.create(humidity);
    })
    .then((asp) => {
      samp.subjectId = ipar;
      samp.aspectId = asp.id;
      return Sample.create(samp);
    })
    .then(() => {
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('Subject isPublished tests: ', () => {
    it('Subject should not be found once isPublished is ' +
    'set to false', (done) => {
      Subject.scope('hierarchy').findById(igrn)
      .then((sub) => sub.update({ isPublished: false }))
      .then(() => Subject.scope('hierarchy').findById(igrn))
      .then((sub) => {
        expect(sub).to.equal(null);
        done();
      })
      .catch(done);
    });

    it('setting grand child to isPublished = false should not break' +
    'the hierarchy from parent', (done) => {
      Subject.findById(igrn)
      .then((sub) => sub.update({ isPublished: false }))
      .then(() => Subject.scope('hierarchy').findById(ipar))
      .then((o) => {
        expect(o).to.not.equal(null);
        const parSub = o.get({ plain: true });
        expect(parSub.children).to.have.length(2);
        const childSub = parSub.children[0].get();
        expect(childSub).to.not.equal(null);
        done();
      })
      .catch(done);
    });

    it('setting child and grandChild to isPublished = false should not ' +
    'break the hierarchy from parent', (done) => {
      Subject.findById(igrn)
      .then((sub) => sub.update({ isPublished: false }))
      .then(() => Subject.findById(ichi))
      .then((sub) => sub.update({ isPublished: false }))
      .then(() => Subject.scope('hierarchy').findById(ipar))
      .then((sub) => {
        expect(sub).to.not.equal(null);
        expect(sub.children).to.have.length(1);
        done();
      })
      .catch(done);
    });

    it('setting otherGrn to isPublished = false should not break ' +
    'the enitre hierarchy from parent', (done) => {
      Subject.scope('hierarchy').findById(ipar)
      .then((sub) => {
        expect(sub.children).to.have.length(2);
        return Subject.findById(otherChildId);
      })
      .then((sub) => sub.update({ isPublished: false }))
      .then(() => Subject.scope('hierarchy').findById(ipar))
      .then((sub) => {
        expect(sub).to.not.equal(null);
        expect(sub.children).to.have.length(1);
        const o = sub.children[0].get({ plain: true });
        expect(o.children).to.have.length(1);
        done();
      })
      .catch(done);
    });

    describe('Subject hierarchy with samples isPublished tests: ', () => {
      it('include samples.relatedLinks association in herarchy',
      (done) => {
        Subject.scope(['hierarchy', 'withSamples']).findById(ipar)
        .then((sub) => {
          expect(sub.samples[0].relatedLinks).to.exist;
          done();
        })
        .catch(done);
      });
    });

    describe('Subject hierarchy with samples: ', () => {
      it('sample default scope should not have subject model in the resullset',
      (done) => {
        Subject.scope(['hierarchy', 'withSamples']).findById(ipar)
        .then((sub) => {
          expect(sub.samples[0].subject).to.equal(undefined);
          done();
        })
        .catch(done);
      });
    });
  });
});
