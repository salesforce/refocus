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

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    u.doSetup()
    .then((createdLens) => tu.db.Perspective.create({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLens.id,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature', 'humidity'],
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilter: ['Critical', '-OK'],
    }))
    .then((createdPersp) => {
      perspectiveId = createdPersp.id;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('patch rootSubject', (done) => {
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({ rootSubject: 'changedMainSubject' })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.rootSubject).to.equal('changedMainSubject');
      return done();
    });
  });

  it('patch aspectFilter', (done) => {
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .send({ aspectTagFilter: ['ctemp', 'chum'], })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.aspectTagFilter).to.eql(['ctemp', 'chum']);
      return done();
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
        return done(err);
      }

      return done();
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
        return done(err);
      }

      return done();
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
        return done(err);
      }

      return done();
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
        return done(err);
      }

      return done();
    });
  });
});
