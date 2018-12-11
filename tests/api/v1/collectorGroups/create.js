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
const collectorUtils = require('../collectors/utils');

describe('tests/api/v1/collectorGroups/create.js >', () => {
  let token;
  let collectorObj1;
  let collectorObj2;
  let collectorObj3;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    }).catch(done);
  });

  after(tu.forceDeleteUser);

  beforeEach((done) => {
    collectorObj1 = collectorUtils.getCollectorToCreate();
    collectorObj1.name = 'coll-1';
    Collector.create(collectorObj1)
      .then(() => {
        collectorObj2 = collectorUtils.getCollectorToCreate();
        collectorObj2.name = 'coll-2';
        Collector.create(collectorObj2);
      })
      .then(() => {
        collectorObj3 = collectorUtils.getCollectorToCreate();
        collectorObj3.name = 'coll-3';
        Collector.create(collectorObj3);
      })
      .then(done())
      .catch(done);
  });

  afterEach(u.forceDelete);

  it('Must create a collector group with empty collector list', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-empty',
        description: 'coll-group-empty-description',
      })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('description');
        expect(res.body.name).to.be.equal('coll-group-empty');
        expect(res.body.description)
          .to.be.equal('coll-group-empty-description');
        expect(res.body).to.have.property('collectors');
        expect(res.body.collectors.length).to.be.equal(0);
        return done();
      });
  });

  it('Must create a collector group with 1 collector in the list', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-one-collector',
        description: 'coll-group-description-one-collector',
        collectors: [collectorObj1.name],
      })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('description');
        expect(res.body.name).to.be.equal('coll-group-name-one-collector');
        expect(res.body.description)
          .to.be.equal('coll-group-description-one-collector');
        expect(res.body).to.have.property('collectors');
        expect(res.body.collectors.length).to.be.equal(1);
        return done();
      });
  });

  it('Must create a collector group with 2 collectors in the list', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-2-collectors',
        description: 'coll-group-description-2-collectors',
        collectors: [collectorObj1.name, collectorObj2.name],
      })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('description');
        expect(res.body.name).to.be.equal('coll-group-name-2-collectors');
        expect(res.body.description)
          .to.be.equal('coll-group-description-2-collectors');
        expect(res.body).to.have.property('collectors');
        expect(res.body.collectors.length).to.be.equal(2);
        return done();
      });
  });

  it('Must fail when one collector is already assigned ', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group',
        description: 'coll-description',
        collectors: [collectorObj3.name],
      })
      .expect(constants.httpStatus.CREATED)
      .end(() => {
        api.post('/v1/collectorGroups')
          .set('Authorization', token)
          .send({
            name: 'coll-group-must-fail',
            description: 'coll-description-must-fail',
            collectors: [collectorObj1.name, collectorObj3.name],
          })
          .expect(constants.httpStatus.BAD_REQUEST)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body.errors[0].message)
              .to.be.equal('Collector coll-3 already assigned to a different group');
            return done();
          });
      });
  });

  it('Must fail when more than one collector is already assigned', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group',
        description: 'coll-group-description',
        collectors: [collectorObj1.name, collectorObj2.name],
      })
      .expect(constants.httpStatus.CREATED)
      .end(() => {
        api.post('/v1/collectorGroups')
          .set('Authorization', token)
          .send({
            name: 'coll-group-name-fail-2',
            description: 'coll-group-description-fail-2',
            collectors: [collectorObj1.name, collectorObj2.name],
          })
          .expect(constants.httpStatus.BAD_REQUEST)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body.errors[0].message)
              .to.be.equal('Collector coll-1,coll-2 already assigned to a different group');
            return done();
          });
      });
  });
});
