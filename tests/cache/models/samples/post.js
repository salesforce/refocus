/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/post.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const path = '/v1/samples';
const rtu = require('../redisTestUtil');
const redisOps = require('../../../../cache/redisOps');
const samstoinit = require('../../../../cache/sampleStoreInit');
const expect = require('chai').expect;
const ZERO = 0;
const u = require('./utils');

describe('tests/cache/models/samples/post.js >', () => {
  describe(`api: redisStore: POST ${path} >`, () => {
    let sampleToPost;
    let subjectId;
    let aspectId;
    let token;
    const sampleName = `${tu.namePrefix}TEST_SUBJECT` + '.' +
    `${tu.namePrefix}CHILD_SUBJECT` + '|' + `${tu.namePrefix}TEST_ASPECT`;

    before((done) => {
      tu.toggleOverride('enableRedisSampleStore', true);
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    beforeEach((done) => {
      new tu.db.Sequelize.Promise((resolve, reject) => {
        const samp = { value: '1' };
        tu.db.Aspect.create(u.aspectToCreate)
        .then((a) => {
          aspectId = a.id;
          samp.aspectId = a.id;
          return tu.db.Subject.create(u.subjectToCreate);
        })
        .then((s) => tu.db.Subject.create({
          isPublished: true,
          name: `${tu.namePrefix}CHILD_SUBJECT`,
          parentId: s.id,
        }))
        .then((s) => {
          subjectId = s.id;
          samp.subjectId = s.id;
          resolve(samp);
        })
        .catch((err) => reject(err));
      })
      .then((samp) => {
        sampleToPost = samp;
        return samstoinit.eradicate();
      })
      .then(() => samstoinit.init())
      .then(() => done())
      .catch(done);
    });

    afterEach(rtu.forceDelete);
    after(tu.forceDeleteUser);
    after(() => tu.toggleOverride('enableRedisSampleStore', false));

    describe('unpublished subject/aspect fails >', () => {
      it('unpublished aspect fails', (done) => {
        tu.db.Aspect.create({
          isPublished: false,
          name: `${tu.namePrefix}UNPUBLISHED_ASPECT`,
          timeout: '3d',
        })
        .then((a) => {
          const sampleWithUnpublishedAspect = {
            aspectId: a.id,
            subjectId,
            value: '1',
          };

          api.post(path)
          .set('Authorization', token)
          .send(sampleWithUnpublishedAspect)
          .expect(constants.httpStatus.NOT_FOUND)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const _err = res.body.errors[ZERO];
            expect(_err.type).to.equal('ResourceNotFoundError');
            expect(_err.description).to.equal('Aspect not found.');
            return done();
          });
        });
      });

      it('unpublished subject fails', (done) => {
        tu.db.Subject.create({
          isPublished: false,
          name: `${tu.namePrefix}UNPUBLISHED_SUBJECT`,
        })
        .then((s) => {
          const sampleWithUnpublishedSubject = {
            aspectId,
            subjectId: s.id,
            value: '1',
          };

          api.post(path)
          .set('Authorization', token)
          .send(sampleWithUnpublishedSubject)
          .expect(constants.httpStatus.NOT_FOUND)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const _err = res.body.errors[ZERO];
            expect(_err.type).to.equal('ResourceNotFoundError');
            expect(_err.description).to.equal('Subject not found.');
            return done();
          });
        });
      });
    });

    describe('post duplicate fails >', () => {
      beforeEach((done) => {
        tu.db.Sample.create(sampleToPost)
        .then(() => samstoinit.eradicate())
        .then(() => samstoinit.init())
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
            return done(err);
          }

          expect(res.body.errors[ZERO].type).to.equal('ForbiddenError');
          expect(res.body.errors[ZERO].description)
          .to.equal('Sample already exists.');
          return done();
        });
      });

      it('with case different name', (done) => {
        api.post(path)
        .set('Authorization', token)
        .send(sampleToPost)
        .expect(constants.httpStatus.FORBIDDEN)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors[ZERO].type).to.equal('ForbiddenError');
          expect(res.body.errors[ZERO].description)
          .to.equal('Sample already exists.');
          return done();
        });
      });
    });

    it('reject if name is in request body', (done) => {
      sampleToPost.name = '!#@#$%^&';
      api.post(path)
      .set('Authorization', token)
      .send(sampleToPost)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const error = res.body.errors[0];
        expect(error.type).to.equal('ValidationError');
        expect(error.description).to.contain('name');
        return done();
      });
    });

    it('aspect is added', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(sampleToPost)
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const cmds = [];
        const subjAspArr = sampleName.toLowerCase().split('|');
        cmds.push(redisOps.aspExistsInSubjSetCmd(subjAspArr[0], subjAspArr[1]));
        redisOps.executeBatchCmds(cmds)
        .then((response) => {
          expect(response[0]).to.be.equal(1);
        });

        done();
      });
    });

    it('returns aspectId, subjectId, and NO aspect object', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(sampleToPost)
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.aspect).to.be.undefined;
        expect(tu.looksLikeId(res.body.aspectId)).to.be.true;
        expect(tu.looksLikeId(res.body.subjectId)).to.be.true;
        return done();
      });
    });

    it('basic post /samples', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(sampleToPost)
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        if (!res.body) {
          throw new Error('expecting sample');
        }

        if (res.body.status !== constants.statuses.Critical) {
          throw new Error('Incorrect Status Value');
        }

        expect(res.body.name).to.be.equal(sampleName);
        return done();
      });
    });

    it('basic post /samples with invalid token', (done) => {
      api.post(path)
      .set('Authorization', 'invalidtoken')
      .send(sampleToPost)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });

    it('createdAt and updatedAt fields have the expected format', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(sampleToPost)
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const { updatedAt, createdAt } = res.body;
        expect(updatedAt).to.equal(new Date(updatedAt).toISOString());
        expect(createdAt).to.equal(new Date(createdAt).toISOString());
        return done();
      });
    });

    it('does not return id', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(sampleToPost)
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.id).to.be.undefined;
        return done();
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
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.relatedLinks).to.have.length(relatedLinks.length);
        return done();
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
        expect(res.body.errors[ZERO].description)
        .to.contain('Name of the relatedlinks should be unique.');
      })
      .end(done);
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
      .end(done);
    });
  });
});
