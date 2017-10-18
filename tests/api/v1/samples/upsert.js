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
const POST_PATH = '/v1/samples';

describe(`tests/api/v1/samples/upsert.js, POST ${path} >`, () => {
  let aspect;
  let subject;
  let token;
  const DONT_EXIST_NAME = 'iDontExist';
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

  it('name field is required', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      value: '2',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const error = res.body.errors[0];
      expect(error.message).to.contain('name');
      expect(error.type)
        .to.equal(tu.schemaValidationErrorName);
      done();
    });
  });

  describe('not found cases >', () => {
    it('with non existing aspect', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${DONT_EXIST_NAME}`,
        value: '2',
      })
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('with non existing subject', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${DONT_EXIST_NAME}|${aspect.name}`,
        value: '2',
      })
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });
  });

  describe(`unpublished subject >`, () => {
    let unPublishedSubjectAbsolutePath;

    // unpublish the subject
    beforeEach((done) => {
      Subject.findById(subject.id)
      .then((subjectOne) => subjectOne.update({
        isPublished: false,
      }))
      .then((_subject) => {
        unPublishedSubjectAbsolutePath = _subject.absolutePath;
        done();
      })
      .catch(done);
    });

    it('name refers to unpublished subject', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${unPublishedSubjectAbsolutePath.absolutePath}|${aspect.name}`,
        value: '2',
      })
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        done();
      });
    });
  });

  describe(`unpublished aspect >`, () => {
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

    it('name refers to unpublished aspect', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${updatedAspect.name}`,
        value: '2',
      })
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });
  });

  describe('sample does not exist >', () => {
    it('upsert succeeds', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.be.an('object');
        expect(res.body.status).to.equal(constants.statuses.Warning);
        done();
      });
    });

    it('case-incorrect name becomes a combination of subject absolutePath' +
      ' and aspect name', (done) => {
      const sampleName = `${subject.absolutePath}|${aspect.name}`;
      api.post(path)
      .set('Authorization', token)
      .send({
        name: sampleName.toLowerCase(),
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(sampleName);
        done();
      });
    });

    it('id is not returned', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.id).to.be.undefined;
        done();
      });
    });

    it('check apiLinks end with sample name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const { apiLinks } = res.body;
        expect(apiLinks.length).to.be.above(0);
        let href = '';
        for (let j = apiLinks.length - 1; j >= 0; j--) {
          href = apiLinks[j].href;
          if (apiLinks[j].method != 'POST') {
            expect(href.split('/').pop()).to.equal(u.sampleName);
          } else {
            expect(href).to.equal(POST_PATH);
          }
        }

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
          return done(err);
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
          return done(err);
        }

        const { source, description } = res.body.errors[0];
        expect(description)
          .to.contain('Name of the relatedlinks should be unique');
        expect(source).to.equal('Sample');
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
      .end(done);
    });

    it('aspect not found yields NOT FOUND', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.name}|xxxxx`,
        value: '2',
      })
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });
  });

  describe('sample already exists >', () => {
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

    it('case-incorrect name becomes a combination of subject absolutePath' +
      ' and aspect name', (done) => {
      const sampleName = `${subject.absolutePath}|${aspect.name}`;
      api.post(path)
      .set('Authorization', token)
      .send({
        name: sampleName.toLowerCase(),
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(sampleName);
        done();
      });
    });

    it('id is not returned', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.id).to.be.undefined;
        done();
      });
    });

    it('check apiLinks end with sample name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '2',
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const { apiLinks } = res.body;
        expect(apiLinks.length).to.be.above(0);
        let href = '';
        for (let j = apiLinks.length - 1; j >= 0; j--) {
          href = apiLinks[j].href;
          if (apiLinks[j].method != 'POST') {
            expect(href.split('/').pop()).to.equal(u.sampleName);
          } else {
            expect(href).to.equal(POST_PATH);
          }
        }

        done();
      });
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
          return done(err);
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
          return done(err);
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
        api.get(`/v1/samples?name=${subject.absolutePath}|${aspect.name}`)
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(1);
          expect(res.body[0].name)
          .to.equal(`${subject.absolutePath}|${aspect.name}`);
          done();
        });
      });
    });

    describe('with readOnly fields should fail >', () => {
      it('status', (done) => {
        api.post(path)
        .set('Authorization', token)
        .send({
          name: `${subject.absolutePath}|${aspect.name}`,
          status: 'Invalid',
        })
        .expect(constants.httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors[0].description)
          .to.contain('You cannot modify the read-only field: status');
          return done();
        });
      });

      it('isDeleted', (done) => {
        api.post(path)
        .set('Authorization', token)
        .send({
          name: `${subject.absolutePath}|${aspect.name}`,
          isDeleted: 0,
        })
        .expect(constants.httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors[0].description)
          .to.contain('You cannot modify the read-only field: isDeleted');
          return done();
        });
      });

      it('createdAt', (done) => {
        api.post(path)
        .set('Authorization', token)
        .send({
          name: `${subject.absolutePath}|${aspect.name}`,
          createdAt: new Date().toString(),
        })
        .expect(constants.httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors[0].description)
          .to.contain('You cannot modify the read-only field: createdAt');
          return done();
        });
      });
    });
  });
});
