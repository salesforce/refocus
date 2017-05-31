/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/tokenNotReq/subjectGetHierarchy.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../index').app);
const constants = require('../../api/v1/constants');
const tu = require('../testUtils');
const u = require('../api/v1/subjects/utils');
const Subject = tu.db.Subject;
const path = '/v1/subjects/{key}/hierarchy';
const expect = require('chai').expect;

describe(`token not required api: GET ${path}`, () => {
  const par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  const chi = { name: `${tu.namePrefix}Canada`, isPublished: true };
  const grn = { name: `${tu.namePrefix}Quebec`, isPublished: true };

  const aspect = {
    name: 'temperature',
    timeout: '30s',
    isPublished: true,
  };

  const sample1 = { value: '10' };

  let ipar = 0;
  let ichi = 0;

  before((done) => {
    Subject.create(par)
    .then((subj) => {
      ipar = subj.id;
    })
    .then(() => {
      chi.parentId = ipar;
      return Subject.create(chi);
    })
    .then((subj) => {
      ichi = subj.id;
      grn.parentId = ichi;
      return Subject.create(grn);
    }).then((sub) => {
      sample1.subjectId = sub.id;
      return tu.db.Aspect.create(aspect);
    }).then((a) => {
      sample1.aspectId = a.id;
      return tu.db.Sample.create(sample1);
    })
    .then((samp) => {
      sample1.id = samp.id;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  describe('subject hierarchy with samples', () => {
    it('should be an empty object at the parent level (with token)', (done) => {
      api.get(path.replace('{key}', ipar))
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.samples).to.be.an('array');
        expect(res.body.samples).to.be.empty;
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
  });
});
