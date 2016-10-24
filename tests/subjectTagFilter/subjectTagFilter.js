/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/subjectTagFilter/subjectTagFilter.js
 */
'use strict';
const supertest = require('supertest');

const api = supertest(require('../../index').app);
const constants = require('../../api/v1/constants');
const tu = require('../testUtils');
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
});
