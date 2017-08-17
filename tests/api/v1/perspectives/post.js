/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/perspectives/post.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/perspectives';
const expect = require('chai').expect;
const ZERO = 0;

describe('tests/api/v1/perspectives/post.js >', () => {
  let createdLensId;
  let token;
  const name = `${tu.namePrefix}testPersp`;
  const basicParams = {
    name,
    rootSubject: 'myMainSubject',
  };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    u.doSetup()
    .then((lens) => {
      createdLensId = lens.id;
      basicParams.lensId = createdLensId;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('post duplicate fails >', () => {
    beforeEach((done) => {
      tu.db.Perspective.create(basicParams)
      .then(() => done())
      .catch(done);
    });

    it('with identical name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(basicParams)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type)
          .to.equal(tu.uniErrorName);
        done();
      });
    });

    it('with case different name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(basicParams)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type).to.equal(tu.uniErrorName);
        done();
      });
    });
  });

  it('OK, no filter', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(basicParams)
    .expect(constants.httpStatus.CREATED)
    .end(done);
  });

  it('OK, with filters', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature', 'humidity'],
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilter: ['Critical', '-OK'],
    })
    .expect(constants.httpStatus.CREATED)
    .end(done);
  });

  it('perspective with fitertype INCLUDE and filter not specified ' +
    'is invalid', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      aspectFilterType: 'INCLUDE',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.equal('InvalidPerspectiveError');
      done();
    });
  });

  it('EXLUCDE should be the default filter ' +
      'type when not specified', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature', 'humidity'],
      aspectFilterType: 'INCLUDE',
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilterType: 'EXCLUDE',
      statusFilter: ['Critical', '-OK'],
    })
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.aspectFilterType).to.equal('INCLUDE');
      expect(res.body.aspectTagFilterType).to.equal('EXCLUDE');
      expect(res.body.subjectTagFilterType).to.equal('EXCLUDE');
      expect(res.body.statusFilterType).to.equal('EXCLUDE');
      done();
    });
  });

  it('Filters should default to an empty array when no ' +
      'filter is specified', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      aspectTagFilter: ['ea', 'na'],

    })
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.aspectFilterType).to.equal('EXCLUDE');
      expect(res.body.aspectTagFilterType).to.equal('EXCLUDE');
      expect(res.body.subjectTagFilterType).to.equal('EXCLUDE');
      expect(res.body.statusFilterType).to.equal('EXCLUDE');

      expect(res.body.aspectFilter.length).to.equal(0);
      expect(res.body.aspectTagFilter.length).to.equal(2);
      expect(res.body.subjectTagFilter.length).to.equal(0);
      expect(res.body.statusFilter.length).to.equal(0);
      done();
    });
  });

  it('root subject required', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });

  it('validates aspectFilter', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      aspectFilter: ['temperature#'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });

  it('validates aspectTagFilter', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      aspectTagFilter: ['temp#', 'hum'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });

  it('validates subjectTagFilter', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      subjectTagFilter: ['ea#', 'na'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });

  it('validates statusFilter', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${tu.namePrefix}testPersp`,
      lensId: createdLensId,
      rootSubject: 'myMainSubject',
      statusFilter: ['Critical', '-OKAY'],
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });
});
