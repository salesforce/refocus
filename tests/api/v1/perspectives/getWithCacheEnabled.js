/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/perspectives/getWithCacheEnabled.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/perspectives';
const expect = require('chai').expect;
const redisCache = require('../../../../cache/redisCache').client.cache;

describe(`api: GET ${path}`, () => {
  let lensId;
  let perspectiveId;
  let token;
  let perspectiveModel;
  const patchData = { rootSubject: 'UPDATED' };

  const originalPerspective = {
    name: `${tu.namePrefix}testPersp`,
    rootSubject: 'myMainSubject',
    aspectFilter: ['temperature', 'humidity'],
    aspectTagFilter: ['temp', 'hum'],
    subjectTagFilter: ['ea', 'na'],
    statusFilter: ['Critical', '-OK'],
  };

  const updatedPerspective = {
    name: `${tu.namePrefix}testPersp`,
    rootSubject: 'UPDATED',
    aspectFilter: ['temperature', 'humidity'],
    aspectTagFilter: ['temp', 'hum'],
    subjectTagFilter: ['ea', 'na'],
    statusFilter: ['Critical', '-OK'],
  };

  const expectedKeys = ['name', 'lensId', 'lens', 'aspectFilter',
    'aspectTagFilter', 'subjectTagFilter', 'statusFilter'];

  before((done) => {
    tu.toggleOverride('enableApiActivityLogs', true);
    tu.toggleOverride('enableCachePerspective', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    u.doSetup()
    .then((createdLens) => {
      lensId = createdLens.id;
      originalPerspective.lensId = lensId;
      updatedPerspective.lensId = lensId;

      done();
    })
    .catch(done);
  });

  //create the perspective
  beforeEach((done) => {

    tu.db.Perspective.create(originalPerspective)
    .then((createdPersp) => {
      perspectiveModel = createdPersp;
      perspectiveId = createdPersp.id;
      done();
    })
    .catch(done);
  });

  //get requests to prime the cache
  beforeEach((done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {

      api.get(`${path}/${perspectiveId}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {

        api.get(`${path}?fields=rootSubject`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {

          api.get(`${path}/${perspectiveId}?fields=rootSubject`)
          .set('Authorization', token)
          .expect(constants.httpStatus.OK)
          .end((err, res) => {
            done();
          });
        });
      });
    });
  });

  afterEach((done) => {
    redisCache.flushdb();
    perspectiveModel.destroy()
    .then(() => {
      perspectiveModel = undefined;
      done();
    });
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  after(() => tu.toggleOverride('enableApiActivityLogs', false));
  after(() => tu.toggleOverride('enableCachePerspective', false));


  it('get all', (done) => {

    // get from the cache
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {

      if (err) done(err);
      expect(res.body).to.be.an.array;
      const perspective = res.body.find(p => p.id === perspectiveId);
      expect(perspective.rootSubject).to.equal('myMainSubject');
      expect(perspective).to.include.all.keys(expectedKeys);
      done();
    });
  });

  it('put then get all', (done) => {

    // put the perspective
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .send(updatedPerspective)
    .end((err, res) => {

      // get the updated perspective from the db
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {

        if (err) done(err);
        expect(res.body).to.be.an.array;
        const perspective = res.body.find(p => p.id === perspectiveId);
        expect(perspective.rootSubject).to.equal('UPDATED');
        expect(perspective).to.include.all.keys(expectedKeys);
        done();
      });
    });
  });

  it('patch then get all', (done) => {

    // patch the perspective
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .send(patchData)
    .end((err, res) => {

      // get the updated perspective from the db
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {

        if (err) done(err);
        expect(res.body).to.be.an.array;
        const perspective = res.body.find(p => p.id === perspectiveId);
        expect(perspective.rootSubject).to.equal('UPDATED');
        expect(perspective).to.include.all.keys(expectedKeys);
        done();
      });
    });
  });

  it('delete then get all', (done) => {

    // delete the perspective
    api.delete(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {

      // attempt to get the perspective from the db
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {

        if (err) done(err);
        expect(res.body).to.be.an.array;
        const perspective = res.body.find(p => p.id === perspectiveId);
        expect(perspective).to.not.exist;
        done();
      });
    });
  });


  it('get by id', (done) => {

    // get from the cache
    api.get(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {

      if (err) done(err);
      const perspective = res.body;
      expect(perspective.rootSubject).to.equal('myMainSubject');
      expect(perspective).to.include.all.keys(expectedKeys);
      done();
    });
  });

  it('put then get by id', (done) => {

    // put the perspective
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .send(updatedPerspective)
    .end((err, res) => {

      // get the updated perspective from the db
      api.get(`${path}/${perspectiveId}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {

        if (err) done(err);
        const perspective = res.body;
        expect(perspective.rootSubject).to.equal('UPDATED');
        expect(perspective).to.include.all.keys(expectedKeys);
        done();
      });
    });
  });

  it('patch then get by id', (done) => {

    // patch the perspective
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .send(patchData)
    .end((err, res) => {

      // get the updated perspective from the db
      api.get(`${path}/${perspectiveId}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {

        if (err) done(err);
        const perspective = res.body;
        expect(perspective.rootSubject).to.equal('UPDATED');
        expect(perspective).to.include.all.keys(expectedKeys);
        done();
      });
    });
  });

  it('delete then get by id', (done) => {

    // delete the perspective
    api.delete(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {

      // attempt to get the perspective from the db
      api.get(`${path}/${perspectiveId}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err, res) => {
        if (err) done(err);
        else done();
      });
    });
  });


  it('get all with fields', (done) => {

    // get from the db
    api.get(`${path}/?fields=rootSubject`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {

      if (err) done(err);
      expect(res.body).to.be.an.array;
      const perspective = res.body.find(p => p.id === perspectiveId);
      expect(perspective.rootSubject).to.equal('myMainSubject');
      expect(perspective).to.not.have.any.keys(expectedKeys);
      done();
    });
  });

  it('put then get all with fields', (done) => {

    // put the perspective
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .send(updatedPerspective)
    .end((err, res) => {

      // get the updated perspective from the db
      api.get(`${path}/?fields=rootSubject`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {

        if (err) done(err);
        expect(res.body).to.be.an.array;
        const perspective = res.body.find(p => p.id === perspectiveId);
        expect(perspective.rootSubject).to.equal('UPDATED');
        expect(perspective).to.not.have.any.keys(expectedKeys);
        done();
      });
    });
  });

  it('patch then get all with fields', (done) => {

    // patch the perspective
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .send(patchData)
    .end((err, res) => {

      // get the updated perspective from the db
      api.get(`${path}/?fields=rootSubject`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {

        if (err) done(err);
        expect(res.body).to.be.an.array;
        const perspective = res.body.find(p => p.id === perspectiveId);
        expect(perspective.rootSubject).to.equal('UPDATED');
        expect(perspective).to.not.have.any.keys(expectedKeys);
        done();
      });
    });
  });

  it('delete then get all with fields', (done) => {

    // delete the perspective
    api.delete(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {

      // attempt to get the perspective from the db
      api.get(`${path}/?fields=rootSubject`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {

        if (err) done(err);
        expect(res.body).to.be.an.array;
        const perspective = res.body.find(p => p.id === perspectiveId);
        expect(perspective).to.not.exist;
        done();
      });
    });
  });


  it('get by id with fields', (done) => {

    // get from the db
    api.get(`${path}/${perspectiveId}?fields=rootSubject`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {

      if (err) done(err);
      const perspective = res.body;
      expect(perspective.rootSubject).to.equal('myMainSubject');
      expect(perspective).to.not.have.any.keys(expectedKeys);
      done();
    });
  });

  it('put then get by id with fields', (done) => {

    // put the perspective
    api.put(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .send(updatedPerspective)
    .end((err, res) => {

      // get the updated perspective from the db
      api.get(`${path}/${perspectiveId}?fields=rootSubject`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {

        if (err) done(err);
        const perspective = res.body;
        expect(perspective.rootSubject).to.equal('UPDATED');
        expect(perspective).to.not.have.any.keys(expectedKeys);
        done();
      });
    });
  });

  it('patch then get by id with fields', (done) => {

    // patch the perspective
    api.patch(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .send(patchData)
    .end((err, res) => {

      // get the updated perspective from the db
      api.get(`${path}/${perspectiveId}?fields=rootSubject`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {

        if (err) done(err);
        const perspective = res.body;
        expect(perspective.rootSubject).to.equal('UPDATED');
        expect(perspective).to.not.have.any.keys(expectedKeys);
        done();
      });
    });
  });

  it('delete then get by id with fields', (done) => {

    // delete the perspective
    api.delete(`${path}/${perspectiveId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {

      // attempt to get the perspective from the db
      api.get(`${path}/${perspectiveId}?fields=rootSubject`)
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err, res) => {
        if (err) done(err);
        else done();
      });
    });
  });

});
