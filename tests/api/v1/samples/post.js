/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/post.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/samples';
const expect = require('chai').expect;
const ZERO = 0;

describe(`api: POST ${path}`, () => {
  let sampleToPost;
  let token;

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
    .then((samp) => {
      sampleToPost = samp;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('post duplicate fails', () => {
    beforeEach((done) => {
      tu.db.Sample.create(sampleToPost)
      .then(() => done())
      .catch(done);
    });

    it('with identical name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(sampleToPost)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.errors[ZERO].type)
          .to.equal(tu.uniErrorName);
        done();
      });
    });

    it('with case different name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(sampleToPost)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.errors[ZERO].type)
          .to.equal(tu.uniErrorName);
        done();
      });
    });
  });

  it('check apiLinks end with sample name', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      const { apiLinks } = res.body;
      expect(apiLinks.length).to.be.above(ZERO);
      let href = '';
      for (let j = apiLinks.length - 1; j >= 0; j--) {
        href = apiLinks[j].href;
        if (apiLinks[j].method!= 'POST') {
          expect(href.split('/').pop()).to.equal(u.sampleName);
        } else {
          expect(href).to.equal(path);
        }
      }
    })
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('basic post /samples', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      if (!res.body) {
        throw new Error('expecting sample');
      }

      if (res.body.status !== constants.statuses.Critical) {
        throw new Error('Incorrect Status Value');
      }
    })
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('does not return id', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect(constants.httpStatus.CREATED)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.id).to.be.undefined;
      done();
    });
  });

  it('post samples with relatedLinks', (done) => {
    const relatedLinks = [
      { name: 'link1', url: 'https://samples.com' },
      { name: 'link2', url: 'https://samples.com' },
    ];
    sampleToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(relatedLinks.length);
    })
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('posting samples with duplicate relatedLinks should fail', (done) => {
    const relatedLinks = [
      { name: 'link1', url: 'https://samples.com' },
      { name: 'link1', url: 'https://samples.com' },
    ];
    sampleToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect((res) => {
      expect(res.body).to.have.property('errors');
      expect(res.body.errors[ZERO].message)
        .to.contain('Name of the relatedlinks should be unique');
      expect(res.body.errors[ZERO].source)
        .to.contain('relatedLinks');
    })
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('post samples with relatedLinks of size zero', (done) => {
    const relatedLinks = [];
    sampleToPost.relatedLinks = relatedLinks;
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body.relatedLinks).to.have.length(relatedLinks.length);
    })
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('posting with readOnly field previousStatus should fail', (done) => {
    sampleToPost.previousStatus = 'Invalid';
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description).to
      .contain('You cannot modify the read-only field: previousStatus');
      return done();
    });
  });

  it('posting with readOnly field id should fail', (done) => {
    sampleToPost.id = 'abcd1234';
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description).to
      .contain('You cannot modify the read-only field: id');
      return done();
    });
  });

  it('posting with readOnly field updatedAt should fail', (done) => {
    sampleToPost.updatedAt = new Date().toString();
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description).to
      .contain('You cannot modify the read-only field: updatedAt');
      return done();
    });
  });
});

describe(`api: POST ${path} aspect isPublished false`, () => {
  let sampleToPost;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    u.doSetupAspectNotPublished()
    .then((samp) => {
      sampleToPost = samp;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('cannot create sample if aspect not published', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });
});
