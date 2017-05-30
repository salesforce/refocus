/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/upsert.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const redisOps = require('../../../../cache/redisOps');
const rtu = require('../redisTestUtil');
const samstoinit = require('../../../../cache/sampleStoreInit');
const sampleStore = require('../../../../cache/sampleStore');
const redisClient = require('../../../../cache/redisCache').client.sampleStore;
const u = require('./utils');
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

const path = '/v1/samples/upsert';

describe(`api::redisEnabled::POST::upsert ${path}`, () => {
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
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.toggleOverride('enforceWritePermission', false);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  beforeEach((done) => {
    Aspect.create(u.aspectToCreate)
    .then((a) => {
      aspect = a;
      return Subject.create(u.subjectToCreate);
    })
    .then((s) => {
      subject = s;
      return samstoinit.eradicate();
    })
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  afterEach(rtu.forceDelete);
  afterEach(rtu.flushRedis);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  describe('when aspect not present', () => {
    // unpublish the aspects
    beforeEach((done) => {
      redisClient.delAsync(
        sampleStore.toKey(sampleStore.constants.objectType.aspect, aspect.name)
      )
      .then(() => done())
      .catch(done);
    });

    it('sample upsert returns not found', (done) => { // subject issue
      api.post(path)
      .set('Authorization', token)
      .send({
        name: `${subject.absolutePath}|${aspect.name}`,
        value: '2',
      })
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.errors[0].description).to.be
        .equal('aspect not found');
        done();
      });
    });
  });

  it('name field is required', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      value: '2',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      const error = res.body.errors[0];
      expect(error.message).to.contain('name');
      expect(error.type)
        .to.equal(tu.schemaValidationErrorName);
      done();
    });
  });

  it('aspect is added', (done) => {
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
      const cmds = [];
      cmds.push(redisOps.aspExistsInSubjSetCmd(subject.absolutePath, aspect.name));
      redisOps.executeBatchCmds(cmds)
      .then((response) => {
        expect(response[0]).to.be.equal(1);
      });

      done();
    });
  });

  it('returns aspectId, subjectId, and aspect object', (done) => {
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

      expect(res.body.aspect).to.be.an('object');
      expect(tu.looksLikeId(res.body.aspectId)).to.be.true;
      expect(tu.looksLikeId(res.body.subjectId)).to.be.true;
      done();
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

  it('when the sample does not exist, name should match subject absolutePath,' +
    ' aspect name', (done) => {
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
        done(err);
      }

      expect(res.body.name).to.equal(sampleName);
      done();
    });
  });

  it('createdAt and updatedAt fields have the expected format', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.absolutePath}|${aspect.name}`,
      relatedLinks: updatedRelatedLinks,
    })
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      const { updatedAt, createdAt } = res.body;
      expect(updatedAt).to.equal(new Date(updatedAt).toISOString());
      expect(createdAt).to.equal(new Date(createdAt).toISOString());
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

      expect(res.body.errors[0].description).to.equal(
        'Name of the relatedlinks should be unique.'
      );
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

  it('Incorrect sample name BAD_REQUEST', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({
      name: `${subject.name}xxxxx`,
      value: '2',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].description).to.be.equal(
      'Incorrect sample name.');
      done();
    });
  });

  describe('upsert when the sample already exists', () => {
    beforeEach((done) => {
      const subjKey = sampleStore.toKey(
        sampleStore.constants.objectType.subject, subject.absolutePath
      );
      const sampleKey = sampleStore.toKey(
        sampleStore.constants.objectType.sample, `${subject.absolutePath}|${aspect.name}`
      );
      const aspectName = aspect.name;
      redisClient.batch([
        ['sadd', subjKey, aspectName],
        ['sadd', sampleStore.constants.indexKey.sample, sampleKey],
        ['hmset', sampleKey, {
          name: `${subject.absolutePath}|${aspect.name}`,
          value: '1',
          aspectId: aspect.id,
          subjectId: subject.id,
          previousStatus: 'Invalid',
          status: 'Invalid',
        },
        ],
      ]).execAsync()
      .then(() => {
        done();
      })
      .catch(done);
    });

    it('name should match subject absolutePath,' +
      ' aspect name', (done) => {
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
          done(err);
        }

        expect(res.body.name).to.equal(sampleName);
        done();
      });
    });

    it('value is updated', (done) => {
      api.get('/v1/samples?name=' + `${subject.absolutePath}|${aspect.name}`)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body).to.have.length(1);
        expect(res.body[0].value).to.equal('1');
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

        // posting again without related link should still return related link
        api.post(path)
        .set('Authorization', token)
        .send({
          name: `${subject.absolutePath}|${aspect.name}`,
          value: '3',
        })
        .end((err1, res1) => {
          if (err1) {
            done(err1);
          }

          expect(res1.body.relatedLinks).to.have.length(2);
          expect(res1.body.relatedLinks).to.deep.equal(updatedRelatedLinks);
          done();
        });
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
});
