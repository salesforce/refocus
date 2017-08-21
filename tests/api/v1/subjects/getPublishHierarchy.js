/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/getPublishHierarchy.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const path = '/v1/subjects/{key}/hierarchy';
const expect = require('chai').expect;

describe(`tests/api/v1/subjects/getPublishHierarchy.js, GET ${path} >`, () => {
  let token;
  let gp = { name: `${tu.namePrefix}America`, isPublished: true };
  let par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  let chi = { name: `${tu.namePrefix}Canada`, isPublished: false };
  let grn = { name: `${tu.namePrefix}Quebec`, isPublished: false };
  const aspectTemp = {
    name: 'temperature',
    timeout: '30s',
    isPublished: true,
  };
  const aspectHumid = {
    name: 'humidity',
    timeout: '30s',
    isPublished: true,
  };
  const sample1 = { value: '10' };
  const sample2 = { value: '10' };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Subject.create(gp)
    .then((subj) => {
      gp = subj;
      par.parentId = gp.id;
      return Subject.create(par);
    })
    .then((subj) => {
      par = subj;
      chi.parentId = par.id;
      sample1.subjectId = subj.id;
      sample2.subjectId = subj.id;
      return Subject.create(chi);
    })
    .then((subj) => {
      chi = subj;
      grn.parentId = chi.id;
      return Subject.create(grn);
    })
    .then((subj) => {
      grn = subj;
      return tu.db.Aspect.create(aspectHumid);
    })
    .then((a) => {
      sample2.aspectId = a.id;
      return tu.db.Aspect.create(aspectTemp);
    })
    .then((a) => {
      sample1.aspectId = a.id;
      return tu.db.Sample.create(sample1);
    })
    .then(() => tu.db.Sample.create(sample2))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('isPublished flag >', () => {
    it('hierarchy at gp level should contain parent as a child', (done) => {
      api.get(path.replace('{key}', gp.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(res.body.children).to.not.equal(null);
        expect(res.body.children).to.have.length(1);
        expect(res.body.children[0].name).to
                  .equal(`${tu.namePrefix}NorthAmerica`);
      })
      .end(done);
    });

    it('hierarchy at parent level should have no children', (done) => {
      api.get(path.replace('{key}', par.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body).to.not.equal(null);
        expect(res.body.children).to.be.empty;
      })
      .end(done);
    });

    it('nothing should be found at the child level', (done) => {
      api.get(path.replace('{key}', chi.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });

    it('nothing should be found at the grn child level', (done) => {
      api.get(path.replace('{key}', chi.id))
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });
  });
});
