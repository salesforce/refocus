/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/delete.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Generator = tu.db.Generator;
const path = '/v1/generators';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;

describe(`api: DELETE ${path}`, () => {
  let generatorId;
  let token;
  const generatorToCreate = u.getGenerator();

  /**
   * Throws error if response object's
   * isDeleted value <= 0
   * @param {Object} res THe response object
   */
  function bodyCheckIfDeleted(res) {
    expect(res.body.isDeleted).to.be.above(ZERO);
  }

  /**
   * Throws error if aspect created for test
   * was returned.
   */
  function notFound() {
    Generator.findById(generatorId)
    .then((aspect) => {
      expect(aspect).to.equal(null);
    });
  }

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Generator.create(generatorToCreate)
    .then((gen) => {
      generatorId = gen.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('delete by id is ok', (done) => {
    api.delete(`${path}/${generatorId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect(bodyCheckIfDeleted)
    .expect(notFound)
    .end((err) => err ? done(err) : done());
  });

  it('delete by name is ok', (done) => {
    api.delete(`${path}/${generatorToCreate.name}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect(bodyCheckIfDeleted)
    .expect(notFound)
    .end((err) => err ? done(err) : done());
  });

  it('delete with case insensitive name succeeds', (done) => {
    api.delete(`${path}/${generatorToCreate.name.toLowerCase()}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect(bodyCheckIfDeleted)
    .expect(notFound)
    .end((err) => err ? done(err) : done());
  });
});
