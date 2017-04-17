/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/perspectives/patch.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/perspectives';
const expect = require('chai').expect;

describe(`api: PATCH ${path}`, () => {
  let perspectiveId;
  let token;
  const aspectFilterArr = ['temperature', 'humidity'];
  const aspectTagFilterArr = ['temp', 'hum'];
  const subjectTagFilterArr = ['ea', 'na'];
  const statusFilterArr = ['Critical', '-OK'];

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    u.doSetup()
    .then((createdLens) => tu.db.Perspective.create({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLens.id,
      rootSubject: 'myMainSubject',
      aspectFilter: aspectFilterArr,
      aspectTagFilter: aspectTagFilterArr,
      subjectTagFilter: subjectTagFilterArr,
      statusFilter: statusFilterArr,
    }))
    .then((createdPersp) => {
      perspectiveId = createdPersp.id;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('update filter types to include ', (done) => {
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({
      aspectFilterType: 'INCLUDE',
      aspectTagFilterType: 'INCLUDE',
      subjectTagFilterType: 'INCLUDE',
      statusFilterType: 'INCLUDE',
    })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.aspectFilterType).to.equal('INCLUDE');
      expect(res.body.aspectTagFilterType).to.equal('INCLUDE');
      expect(res.body.subjectTagFilterType).to.equal('INCLUDE');
      expect(res.body.statusFilterType).to.equal('INCLUDE');
      done();
    });
  });

  it('patch rootSubject', (done) => {
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({ rootSubject: 'changedMainSubject' })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.rootSubject).to.equal('changedMainSubject');
      done();
    });
  });

  it('patch aspectFilter', (done) => {
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({ aspectTagFilter: ['ctemp', 'chum'], })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.aspectTagFilter).to.eql(['ctemp', 'chum']);
      done();
    });
  });

  it('cannot patch filter with include = []', (done) => {
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({
      subjectTagFilter: [],
      subjectTagFilterType: 'INCLUDE',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        done(err);
      }
      expect(res.body.errors[0].type).to.equal('InvalidPerspectiveError');
      done();
    });
  });

  it('validates aspectFilter', (done) => {
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({
      aspectFilter: ['temperature#'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('validates aspectTagFilter', (done) => {
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({
      aspectTagFilter: ['temp#', 'hum'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('validates subjectTagFilter', (done) => {
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({
      subjectTagFilter: ['ea#', 'na'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('validates statusFilter', (done) => {
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({
      statusFilter: ['Critical', '-OKAY'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });
});
