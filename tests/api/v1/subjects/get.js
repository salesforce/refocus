/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/get.js
 */
'use strict';
const supertest = require('supertest');

const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const path = '/v1/subjects';
const expect = require('chai').expect;

describe(`api: GET ${path}`, () => {
  let token;

  const na = {
    name: `${tu.namePrefix}NorthAmerica`,
    description: 'continent',
  };
  const us = {
    name: `${tu.namePrefix}UnitedStates`,
    description: 'country',
    tags: ['US'],
  };
  const vt = {
    name: `${tu.namePrefix}Vermont`,
    description: 'state',
    tags: ['US', 'NE'],
  };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    Subject.create(na)
    .then((createdNa) => {
      na.id = createdNa.id;
      us.parentId = na.id;
      return Subject.create(us);
    })
    .then((createdUs) => {
      us.id = createdUs.id;
      vt.parentId = us.id;
      return Subject.create(vt);
    })
    .then((createdVt) => {
      vt.id = createdVt.id;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('Check return result of get in alphabetical order of' +
  'absolutePath by default', (done) => {
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[0].absolutePath).to.equal(na.name);
      expect(res.body[1].absolutePath).to.equal(na.name + '.' + us.name);
      expect(res.body[2].absolutePath).to.equal(na.name + '.' + us.name +
        '.' + vt.name);

      done();
    });
  });

  it('Check return result of get in alphabetical order of' +
  'name when use of ?sort=name', (done) => {
    api.get(`${path}?sort=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[0].name).to.equal(na.name);
      expect(res.body[1].name).to.equal(us.name);
      expect(res.body[2].name).to.equal(vt.name);

      done();
    });
  });

  it('Check return result of get in alphabetical order of' +
  'name when use of ?sort=-name', (done) => {
    api.get(`${path}?sort=-name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[2].name).to.equal(na.name);
      expect(res.body[1].name).to.equal(us.name);
      expect(res.body[0].name).to.equal(vt.name);

      done();
    });
  });

  it('GET returns parentAbsolutePath, from root', (done) => {
    api.get(`${path}/${na.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const result = JSON.parse(res.text);
      expect(Object.keys(result)).to.contain('parentAbsolutePath');
      expect(result.parentAbsolutePath).to.equal.null;

      done();
    });
  });

  it('GET returns parentAbsolutePath, from one level down', (done) => {
    api.get(`${path}/${us.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const absPath = res.body.absolutePath;

      // get up to last period
      const expectedParAbsPath =
        absPath.slice(0, absPath.lastIndexOf('.'));

      const result = JSON.parse(res.text);
      expect(Object.keys(result)).to.contain('parentAbsolutePath');
      expect(result.parentAbsolutePath).to.equal(expectedParAbsPath);

      done();
    });
  });

  it('GET returns parentAbsolutePath, from two levels down', (done) => {
    api.get(`${path}/${vt.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const absPath = res.body.absolutePath;

      // get up to last period
      const expectedParAbsPath =
        absPath.slice(0, absPath.lastIndexOf('.'));

      const result = JSON.parse(res.text);
      expect(Object.keys(result)).to.contain('parentAbsolutePath');
      expect(result.parentAbsolutePath).to.equal(expectedParAbsPath);

      done();
    });
  });

  it('GET with tag filter :: one tag', (done) => {
    api.get(`${path}?tags=US`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(2);
      expect(res.body[0].tags).to.eql(['US']);
      expect(res.body[1].tags).to.eql(['US', 'NE']);

      done();
    });
  });

  it('GET with tag filter :: multiple tags', (done) => {
    api.get(`${path}?tags=NE,US`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(1);
      expect(res.body[0].tags).to.eql(['US', 'NE']);

      done();
    });
  });

  it('pagination tests');
  it('childCount, descendentCount');
  it('by id');
  it('by abs path');
  it('returns expected fields when passing ?fields=...');
  it('returns expected fields when NOT passing ?fields=...');
  it('sort order');
});
