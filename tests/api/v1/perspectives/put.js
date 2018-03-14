/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/perspectives/put.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/perspectives';
const expect = require('chai').expect;

describe('tests/api/v1/perspectives/put.js >', () => {
  let perspectiveId;
  let createdLensId;
  let token;
  const name = 'testPersp';
  const aspectFilterArr = ['temperature', 'humidity'];
  const aspectTagFilterArr = ['temp', 'hum'];
  const subjectTagFilterArr = ['ea', 'na'];
  const statusFilterArr = ['Critical', '-OK'];
  const toPut = {
    name: 'testPersp',
    lensId: '',
    rootSubject: 'changedMainSubject',
    aspectFilter: aspectFilterArr,
    aspectTagFilter: aspectTagFilterArr,
    subjectTagFilter: subjectTagFilterArr,
    statusFilter: statusFilterArr,
    aspectFilterType: 'INCLUDE',
    aspectTagFilterType: 'INCLUDE',
    subjectTagFilterType: 'INCLUDE',
    statusFilterType: 'INCLUDE',
  };

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
      name,
      lensId: createdLens.id,
      rootSubject: 'myMainSubject',
      aspectFilter: aspectFilterArr,
      aspectTagFilter: aspectTagFilterArr,
      subjectTagFilter: subjectTagFilterArr,
      statusFilter: statusFilterArr,
    }))
    .then((createdPersp) => {
      perspectiveId = createdPersp.id;
      createdLensId = createdPersp.lensId;
      toPut.lensId = createdLensId;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('update an perspective with include ', (done) => {
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.aspectFilterType).to.equal('INCLUDE');
      expect(res.body.aspectTagFilterType).to.equal('INCLUDE');
      expect(res.body.subjectTagFilterType).to.equal('INCLUDE');
      expect(res.body.statusFilterType).to.equal('INCLUDE');
      done();
    });
  });

  it('update name with different case succeeds', (done) => {
    const newName = name.toUpperCase();
    toPut.name = newName;
    api.put(path + '/' + newName)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(newName);
      done();
    });
  });

  it('update root subject', (done) => {
    toPut.rootSubject = 'changedMainSubject';
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.rootSubject).to.equal('changedMainSubject');
      done();
    });
  });

  it('update aspectTagFilter', (done) => {
    toPut.aspectTagFilter = ['_temp', '_hum'];
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.rootSubject).to.equal('changedMainSubject');
      expect(res.body.aspectTagFilter).to.eql(['_temp', '_hum']);
      done();
    });
  });

  it('cannot update an perspective with include = [] ', (done) => {
    toPut.aspectTagFilter = [];
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('InvalidPerspectiveError');
      done();
    });
  });

  it('validates aspectFilter', (done) => {
    toPut.aspectFilter = ['temperature#'];
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });

  it('validates aspectTagFilter', (done) => {
    toPut.aspectTagFilter = ['temp#', 'hum'];
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });

  it('validates subjectTagFilter', (done) => {
    toPut.subjectTagFilter = ['ea#', 'na'];
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });

  it('validates statusFilter', (done) => {
    toPut.statusFilter = ['Critical', '-OKAY'];
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .set('Authorization', token)
    .send(toPut)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });
});
