/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/perspectives/delete.js
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

describe('tests/api/v1/perspectives/delete.js >', () => {
  let perspectiveId;
  let token;
  const name = `${tu.namePrefix}testPersp`;

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
    .then((createdLens) => tu.db.Perspective.create({
      name,
      lensId: createdLens.id,
      rootSubject: 'myMainSubject',
    }))
    .then((createdPersp) => {
      perspectiveId = createdPersp.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('delete with case insensitive name succeeds', (done) => {
    api.delete(`${path}/${name.toLowerCase()}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(name);
      done();
    });
  });

  it('delete ok', (done) => {
    api.delete(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.isDeleted).to.not.equal(ZERO);
      done();
    });
  });
});
