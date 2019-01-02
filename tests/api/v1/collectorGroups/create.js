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
  let collector1;
  let collector2;
  let collector3;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    }).catch(done);
  });

  beforeEach(() => {
    collector1 = collectorUtils.getCollectorToCreate();
    collector1.name = 'coll-1';
    Collector.create(collector1);
    collector2 = collectorUtils.getCollectorToCreate();
    collector2.name = 'coll-2';
    Collector.create(collector2);
    collector3 = collectorUtils.getCollectorToCreate();
    collector3.name = 'coll-3';
    Collector.create(collector3);
  });

  afterEach(u.forceDelete);

  after(tu.forceDeleteUser);

  it('Must create a collector group with empty collector list', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-empty-colls',
        description: 'coll-group-description-empty-colls',
      })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('description');
        expect(res.body.name).to.be.equal('coll-group-name-empty-colls');
        expect(res.body.description)
          .to.be.equal('coll-group-description-empty-colls');
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
        collectors: [collector1.name],
      })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body.name).to.be.equal('coll-group-name-one-collector');
        expect(res.body).to.have.property('description');
        expect(res.body.description)
          .to.be.equal('coll-group-description-one-collector');
        expect(res.body).to.have.property('collectors');
        expect(res.body.collectors.length).to.be.equal(1);
        const coll = res.body.collectors[0];
        expect(coll).to.have.keys('id', 'name', 'status');
        expect(coll.name).to.equal('coll-1');
        expect(coll.status).to.equal('Stopped');
        return done();
      });
  });

  it('Must create a collector group with more than one collector in the list',
    (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-2-collectors',
        description: 'coll-group-description-2-collectors',
        collectors: [collector1.name, collector2.name],
      })
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name');
        expect(res.body.name).to.be.equal('coll-group-name-2-collectors');
        expect(res.body).to.have.property('description');
        expect(res.body.description)
          .to.be.equal('coll-group-description-2-collectors');
        expect(res.body).to.have.property('collectors');
        expect(res.body.collectors.length).to.be.equal(2);
        return done();
      });
  });

  it('Must fail when one collector is already assigned', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({ // Creating a Collector Group with Collector 3
        name: 'coll-group',
        description: 'coll-description',
        collectors: [collector3.name],
      })
      .expect(constants.httpStatus.CREATED)
      .end(() => {
        api.post('/v1/collectorGroups')
          .set('Authorization', token)
          .send({ // Creating a new Collector Group with one Coll assigned
            name: 'coll-group-must-fail',
            description: 'coll-description-must-fail',
            collectors: [collector1.name, collector3.name],
          })
          .expect(constants.httpStatus.BAD_REQUEST)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            // Must inform that coll 3 is already assigned
            expect(res.body.errors[0].message)
              .to.be
              .equal('Collector coll-3 already assigned to a different group');
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
        collectors: [collector1.name, collector2.name],
      })
      .expect(constants.httpStatus.CREATED)
      .end(() => {
        api.post('/v1/collectorGroups')
          .set('Authorization', token)
          .send({
            name: 'coll-group-name-fail-2',
            description: 'coll-group-description-fail-2',
            collectors: [collector1.name, collector2.name],
          })
          .expect(constants.httpStatus.BAD_REQUEST)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const expectedMessage = 'Collector coll-1,coll-2 already assigned' +
              ' to a different group';

            expect(res.body.errors[0].message).to.be.equal(expectedMessage);
            return done();
          });
      });
  });
});
