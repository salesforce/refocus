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
const httpStatus = require('../../../../api/v1/constants').httpStatus;
const tu = require('../../../testUtils');
const u = require('./utils');
const Collector = tu.db.Collector;
const expect = require('chai').expect;

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
    collector1 = u.getCollectorToCreate();
    collector1.name += '1';
    Collector.create(collector1);
    collector2 = u.getCollectorToCreate();
    collector2.name += '2';
    Collector.create(collector2);
    collector3 = u.getCollectorToCreate();
    collector3.name += '3';
    Collector.create(collector3);
  });

  afterEach(u.forceDelete);

  after(tu.forceDeleteUser);

  it('create collector group with empty collector list', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-empty-colls',
        description: 'coll-group-description-empty-colls',
      })
      .expect(httpStatus.CREATED)
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

  it('create collector group with 1 collector', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-one-collector',
        description: 'coll-group-description-one-collector',
        collectors: [collector1.name],
      })
      .expect(httpStatus.CREATED)
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
        expect(coll.name).to.equal('___Coll1');
        expect(coll.status).to.equal('Stopped');
        return done();
      });
  });

  it('create collector group with more than one collector', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group-name-2-collectors',
        description: 'coll-group-description-2-collectors',
        collectors: [collector1.name, collector2.name],
      })
      .expect(httpStatus.CREATED)
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

  it('fail when one collector is already assigned', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({ // Creating a Collector Group with Collector 3
        name: 'coll-group',
        description: 'coll-description',
        collectors: [collector3.name],
      })
      .expect(httpStatus.CREATED)
      .end(() => {
        api.post('/v1/collectorGroups')
          .set('Authorization', token)
          .send({ // Creating a new Collector Group with one Coll assigned
            name: 'coll-group-must-fail',
            description: 'coll-description-must-fail',
            collectors: [collector1.name, collector3.name],
          })
          .expect(httpStatus.BAD_REQUEST)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            // Must inform that coll 3 is already assigned
            const expectedMessage =
              'Cannot double-assign collector(s) [___Coll3] to collector groups';
            expect(res.body.errors[0])
              .to.have.property('message', expectedMessage);
            return done();
          });
      });
  });

  it('fail when more than one collector already assigned', (done) => {
    api.post('/v1/collectorGroups')
      .set('Authorization', token)
      .send({
        name: 'coll-group',
        description: 'coll-group-description',
        collectors: [collector1.name, collector2.name],
      })
      .expect(httpStatus.CREATED)
      .end(() => {
        api.post('/v1/collectorGroups')
          .set('Authorization', token)
          .send({
            name: 'coll-group-name-fail-2',
            description: 'coll-group-description-fail-2',
            collectors: [collector1.name, collector2.name],
          })
          .expect(httpStatus.BAD_REQUEST)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const expectedMessage = 'Cannot double-assign collector(s) ' +
              '[___Coll1, ___Coll2] to collector groups';

            expect(res.body.errors[0])
              .to.have.property('message', expectedMessage);
            return done();
          });
      });
  });

  it('ok when collector was previously assigned but group was deleted', (done) => {
    api.post('/v1/collectorGroups')
    .set('Authorization', token)
    .send({ // Creating a Collector Group with Collector 3
      name: 'coll-group',
      description: 'coll-description',
      collectors: [collector3.name],
    })
    .expect(httpStatus.CREATED)
    .end(() => {
      api.delete('/v1/collectorGroups/coll-group')
      .set('Authorization', token)
      .expect(httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        api.post('/v1/collectorGroups')
        .set('Authorization', token)
        .send({ // Creating a new Collector Group with one Coll assigned
          name: 'coll-group-2',
          description: 'coll-description',
          collectors: [collector3.name],
        })
        .expect(httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.collectors[0].name).to.equal(collector3.name);
          return done();
        });
      });
    });
  });
});
