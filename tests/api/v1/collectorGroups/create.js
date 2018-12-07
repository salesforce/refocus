/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectorGroups/create.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Collector = tu.db.Collector;
const expect = require('chai').expect;
const collectorCreate = require('../collectors/utils').getCollectorToCreate();

describe('tests/api/v1/collectorGroups/create.js >', () => {
  let token;
  const collectorObj1 = collectorCreate;
  const collectorObj2 = collectorCreate;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    collectorObj1.name = 'coll-1';
    Collector.create(collectorObj1)
      .then(() => {
        done();
      })
      .catch(done);
  });

  // beforeEach((done) => {
  //   collectorObj2.name = 'coll-2';
  //   Collector.create(collectorObj2)
  //   .then(done)
  //   .catch(done);
  // });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('Must create a collector group with empty collector list', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({ name: 'coll-group-1', description: 'coll-description' })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('description');
        expect(res.body).to.not.have.property('collectors');
        return done();
      });
  });

  it('Must create a collector group with one collector in the list', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-2',
        description: 'coll-description-2',
        collectors: [collectorObj1.name],
      })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('description');
        expect(res.body).to.have.property('collectors');
        return done();
      });
  });
});
