/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/perspectives/get.js
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
const ONE = 1;

describe('tests/api/v1/perspectives/get.js >', () => {
  let lensId;
  let perspectiveId;
  let perspectiveName;
  let token;

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
      aspectFilter: ['temperature', 'humidity'],
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilter: ['Critical', '-OK'],
    }))
    .then((createdPersp) => {
      lensId = createdPersp.lensId;
      perspectiveId = createdPersp.id;
      perspectiveName = createdPersp.name;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('basic get', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ONE);
      expect(res.body).to.have.deep.property('[0].id');
      expect(res.body).to.have.deep.property(
        '[0].rootSubject', 'myMainSubject'
      );
      expect(res.body).to.have.deep.property('[0].lensId', lensId);
      expect(res.body[ZERO].aspectFilter).to.eql(['temperature', 'humidity']);
      expect(res.body[ZERO].aspectTagFilter).to.eql(['temp', 'hum']);
      expect(res.body[ZERO].subjectTagFilter).to.eql(['ea', 'na']);
      expect(res.body[ZERO].statusFilter).to.eql(['Critical', '-OK']);

      done();
    });
  });

  it('basic get by id', (done) => {
    api.get(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(`${tu.namePrefix}testPersp`);
      expect(res.body.rootSubject).to.equal('myMainSubject');
      expect(res.body.lensId).to.equal(lensId);
      expect(res.body.aspectFilter).to.eql(['temperature', 'humidity']);
      expect(res.body.aspectTagFilter).to.eql(['temp', 'hum']);
      expect(res.body.subjectTagFilter).to.eql(['ea', 'na']);
      expect(res.body.statusFilter).to.eql(['Critical', '-OK']);

      done();
    });
  });

  it('basic get by name', (done) => {
    api.get(`${path}/${perspectiveName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(`${tu.namePrefix}testPersp`);
      expect(res.body.rootSubject).to.equal('myMainSubject');
      expect(res.body.lensId).to.equal(lensId);
      expect(res.body).to.have.property('lens');
      expect(res.body.aspectFilter).to.eql(['temperature', 'humidity']);
      expect(res.body.aspectTagFilter).to.eql(['temp', 'hum']);
      expect(res.body.subjectTagFilter).to.eql(['ea', 'na']);
      expect(res.body.statusFilter).to.eql(['Critical', '-OK']);
      done();
    });
  });

  it('get by name is case-INsenstive', (done) => {
    api.get(`${path}/${perspectiveName.toLowerCase()}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(`${tu.namePrefix}testPersp`);
      done();
    });
  });

  it('get by name specifying fields to retrieve', (done) => {
    api.get(`${path}/${perspectiveName}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(`${tu.namePrefix}testPersp`);
      expect(res.body).to.not.have.property('rootSubject');
      expect(res.body).to.not.have.property('lens');
      done();
    });
  });

  it('get without lens assoc', (done) => {
    api.get(`${path}?fields=name,rootSubject`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length.of.at.least(ONE);
      expect(res.body[ZERO]).to.have.property('name');
      expect(res.body[ZERO]).to.have.property('rootSubject');
      expect(res.body[ZERO]).to.not.have.property('lens');
      done();
    });
  });

  it('find by rootSubject wildcard, found', (done) => {
    api.get(`${path}?rootSubject=*Main*`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ONE);
      expect(res.body[0]).to.have.property('rootSubject', 'myMainSubject');
      done();
    });
  });

  it('find by rootSubject wildcard, NOT found', (done) => {
    api.get(`${path}?rootSubject=XXXXXXXXXXXX*`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ZERO);
      done();
    });
  });

  it('find by name wildcard, found', (done) => {
    api.get(`${path}?name=*testPersp`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ONE);
      expect(res.body[0]).to.have.property('name', perspectiveName);
      done();
    });
  });

  it('find by name wildcard, NOT found', (done) => {
    api.get(`${path}?name=XXXXXXXXXXXX*`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(ZERO);
      done();
    });
  });
});
