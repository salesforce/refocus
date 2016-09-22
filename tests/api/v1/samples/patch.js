/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/patch.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const path = '/v1/samples';
const expect = require('chai').expect;

describe(`api: PATCH ${path}`, () => {
  let sampleId;
  let sampUpdatedAt;
  let sampleValue;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    u.doSetup()
    .then((samp) => {
      return Sample.create(samp);
    })
    .then((samp) => {
      sampleId = samp.id;
      sampUpdatedAt = samp.updatedAt;
      sampleValue = samp.value;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('UpdatedAt tests: ', () => {
    it('patch /samples without value does not increment ' +
      'updatedAt', (done) => {
      api.patch(`${path}/${sampleId}`)
      .set('Authorization', token)
      .send({})
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        const result = res.body;
        const dateToInt = new Date(result.updatedAt).getTime();
        expect(dateToInt).to.be.equal(sampUpdatedAt.getTime());
        return done();
      });
    });

    it('patch /samples with only identical value increments ' +
      'updatedAt', (done) => {
      api.patch(`${path}/${sampleId}`)
      .set('Authorization', token)
      .send({ value: sampleValue })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        const result = res.body;
        const dateToInt = new Date(result.updatedAt).getTime();
        expect(dateToInt).to.be.above(sampUpdatedAt.getTime());
        return done();
      });
    });
  });

  describe('Lists: ', () => {
    it('basic patch /samples', (done) => {
      api.patch(`${path}/${sampleId}`)
      .set('Authorization', token)
      .send({ value: '3' })
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        if (!(res && res.body &&
          res.body.status === constants.statuses.Warning)) {
          throw new Error('Incorrect Status Value');
        }
      })
      .end((err /* , res */) => {
        if (err) {
          return done(err);
        }

        return done();
      });
    });
  });

  //
  // The relatedlinks are named differently in each of the tests to avoid
  // turning the before and after hooks to beforeEach and afterEach
  //
  describe('Patch Related Links ', () => {
    it('single related link', (done) => {
      api.patch(`${path}/${sampleId}`)
      .set('Authorization', token)
      .send({
        value: '2',
        relatedLinks: [{ name: 'link', url: 'https://samples.com' },
        ]
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.body.relatedLinks).to.have.length(1);
        expect(res.body.relatedLinks).to.have.deep.property('[0].name',
            'link');
        return done();
      });
    });

    it('multiple relatedlinks', (done) => {
      api.put(`${path}/${sampleId}`)
      .set('Authorization', token)
      .send({
        value: '2',
        relatedLinks: []
      })
      .expect(constants.httpStatus.OK)
      .end((err/* , res */) => {
        if (err) {
          return done(err);
        }
        api.patch(`${path}/${sampleId}`)
        .set('Authorization', token)
        .send({
          value: '2',
          relatedLinks: [{ name: 'link0', url: 'https://samples.com' },
          { name: 'link1', url: 'https://samples.com' }]
        })
        .expect(constants.httpStatus.OK)
        .end((_err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body.relatedLinks).to.have.length(2);
          for (let i=0;i<res.body.relatedLinks.length;i++) {
           /*
            * link names are starting from link0 to link1, so adding  the index
            * at the end to get the name dynamically
            */
            expect(res.body.relatedLinks[i]).to.have.property('name',
               'link'+i);
          }
          return done();
        });
      });
    });
    it('with duplicate name', (done) => {
      api.patch(`${path}/${sampleId}`)
      .set('Authorization', token)
      .send({
        value: '2',
        relatedLinks: [{ name: 'link4', url: 'https://samples.com' },
        { name: 'link4', url: 'https://samples.com' }]
      })
      .expect((res) => {
        expect(res.body).to.have.property('errors');
        expect(res.body.errors[0].message)
        .to.contain('Name of the relatedlinks should be unique');
        expect(res.body.errors[0].source)
          .to.contain('relatedLinks');
      })
      .end((err/* , res */) => {
        if (err) {
          return done(err);
        }

        return done();
      });
    });
  });
});

describe(`api: PATCH ${path} aspect isPublished false`, () => {
  let sampleId;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    u.doSetup()
    .then((samp) => {
      return Sample.create(samp);
    })
    .then((samp) => {
      sampleId = samp.id;
      samp.getAspect()
      .then((asp) => {
        asp.update({ isPublished: false });
        done();
      })
      .catch((err) => {
        throw err;
      });
    })
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('cannot patch sample if aspect not published', (done) => {
    api.patch(`${path}/${sampleId}`)
    .set('Authorization', token)
    .send({ value: '3' })
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});

