/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/upsert.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

const path = '/v1/samples/upsert';

describe(`api: POST ${path}`, () => {
  let aspect;
  let subject;
  let token;
  const URL1 = 'https://samples.com';
  const URL2 = 'https://updatedsamples.com';
  const relatedLinks = [
    { name: 'link1', url: URL1 },
    { name: 'link2', url: URL1 },
  ];
  const updatedRelatedLinks = [
    { name: 'link1', url: URL2 },
    { name: 'link2', url: URL2 },
  ];
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Aspect.create(u.aspectToCreate)
    .then((a) => {
      aspect = a;
      return Subject.create(u.subjectToCreate);
    })
    .then((s) => {
      subject = s;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  describe(`when aspect isPublished false`, () => {
    let updatedAspect;

    // unpublish the aspects
    beforeEach((done) => {
      Aspect.findById(aspect.id)
      .then((aspectOne) => aspectOne.update({
        isPublished: false,
      }))
      .then((_aspect) => {
        updatedAspect = _aspect;
        done();
      })
      .catch(done);
    });

    it('sample upsert returns not found', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${updatedAspect.name}`,
        value: '2',
      })
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });
  });

  it('upsert succeeds when the sample does not exist', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
      value: '2',
    })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body).to.be.an('object');
      expect(res.body.status).to.equal(constants.statuses.Warning);
      done();
    });
  });

  it('update sample with relatedLinks', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
      relatedLinks: updatedRelatedLinks,
    })
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.relatedLinks).to.have.length(2);
      expect(res.body.relatedLinks).to.deep.equal(updatedRelatedLinks);
      done();
    });
  });

  it('update to relatedLinks with the same name fails', (done) => {
    const withSameName = [relatedLinks[0], relatedLinks[0]];
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
      relatedLinks: withSameName,
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      const { message, source } = res.body.errors[0];
      expect(message).to.equal('Name of the relatedlinks should be unique');
      expect(source).to.equal('relatedLinks');
      done();
    });
  });

  it('subject not found yields NOT FOUND', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `x|${aspect.name}`,
      value: '2',
    })
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('aspect not found yields NOT FOUND', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.name}|xxxxx`,
      value: '2',
    })
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  describe('upsert when the sample already exists', () => {
    beforeEach((done) => {
      Sample.create({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '1',
        aspectId: aspect.id,
        subjectId: subject.id,
      })
      .then(() => done())
      .catch(done);
    });

    it('value is updated', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.status).to.equal(constants.statuses.Warning);
        done();
      });
    });

    it('update relatedLinks succeeds', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '2',
        relatedLinks: updatedRelatedLinks,
      })
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.relatedLinks).to.have.length(2);
        expect(res.body.relatedLinks).to.deep.equal(updatedRelatedLinks);
        done();
      });
    });

    it('sample is not duplicated', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '2',
      })
      .then(() => {
        api.get('/v1/samples?name=' + `${subject.absolutePath}|${aspect.name}`)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body).to.have.length(1);
          expect(res.body[0].name)
            .to.equal(`${subject.absolutePath}|${aspect.name}`);
          done();
        });
      });
    });
  });

  describe('on case insensitive upsert', () => {
    beforeEach((done) => {
      Sample.create({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '1',
        aspectId: aspect.id,
        subjectId: subject.id,
      })
      .then(() => api.post(path)
      .set('Authorization', token)
      .send({
        // updates the name to use lowercase
        name: `${subject.absolutePath}|${aspect.name}`.toLowerCase(),
        value: '2',
      }))
      .then(() => done())
      .catch(done);
    });

    it('existing sample is not duplicated', (done) => {
      api.get('/v1/samples?name=' + `${subject.absolutePath}|${aspect.name}`)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body).to.have.length(1);
        expect(res.body[0].name)
        .to.equal(`${subject.absolutePath}|${aspect.name}`.toLowerCase());
        done();
      });
    });
  });
});
