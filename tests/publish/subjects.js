/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/publish/subjects.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const featureToggles = require('feature-toggles');
const supertest = require('supertest');
const redis = require('redis');
const rconf = require('../../config/redisConfig');
const constants = require('../../api/v1/constants');
const api = supertest(require('../../express').app);
const tu = require('../testUtils');
const Subject = tu.db.Subject;
const redisPublisher = require('../../realtime/redisPublisher');
const subjectEvents = require('../../realtime/constants').events.subject;
const path = '/v1/subjects';
const DEFAULT_LOCAL_REDIS_URL = '//127.0.0.1:6379';

describe('tests/publish/subjects.js >', () => {
  let token;
  let subscriber;
  let subscribeTracker = [];

  before((done) => {
    subscriber = redis.createClient(DEFAULT_LOCAL_REDIS_URL);
    subscriber.subscribe(rconf.perspectiveChannelName);
    subscriber.on('message', (channel, msg) => subscribeTracker.push(msg));

    tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        api.post(path)
          .set('Authorization', token)
          .send({ name: 'AnotherRoot', isPublished: true })
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            subscribeTracker = [];
            done();
          });
      })
      .catch(done);
  });

  after(() => tu.forceDelete(tu.db.Subject)
    .then(() => tu.forceDelete(tu.db.User))
    .then(() => tu.forceDelete(tu.db.Profile)));

  afterEach(() => subscribeTracker = []);

  describe('POST >', () => {
    it('isPublished true, subscriber gets add event', (done) => {
      const absPath = `${tu.namePrefix}PostPublished`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          const evtBody = evt[subjectEvents.add];
          expect(evtBody).to.include.keys('absolutePath', 'childCount',
            'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
            'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'hierarchyLevel');
          expect(evtBody).to.have.property('absolutePath', absPath);
          done();
        });
    });

    it('isPublished false, subscriber gets no events', (done) => {
      const absPath = `${tu.namePrefix}PostUnpublished`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: false })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(0);
          done();
        });
    });
  });

  describe('PATCH >', () => {
    it('isPublished true>>false, subscriber gets remove event', (done) => {
      const absPath = `${tu.namePrefix}PatchToFalse`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          subscribeTracker = [];

          api.patch(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ isPublished: false })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt = JSON.parse(subscribeTracker[0]);
              expect(evt).to.have.property(subjectEvents.del);
              const evtBody = evt[subjectEvents.del];
              expect(evtBody).to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'hierarchyLevel');
              expect(evtBody).to.have.property('absolutePath', absPath);
              done();
            });
        });
    });

    it('isPublished false>>true, subscriber gets add event', (done) => {
      const absPath = `${tu.namePrefix}PatchToTrue`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: false })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(0);

          api.patch(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ isPublished: true })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt = JSON.parse(subscribeTracker[0]);
              expect(evt).to.have.property(subjectEvents.add);
              const evtBody = evt[subjectEvents.add];
              expect(evtBody).to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'hierarchyLevel');
              expect(evtBody).to.have.property('absolutePath', absPath);
              done();
            });
        });
    });

    it('update parentAbsolutePath of published subject, subscriber gets ' +
      'remove event then add event', (done) => {
      const absPath = `${tu.namePrefix}PatchParentAbsPath`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          subscribeTracker = [];

          api.patch(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ parentAbsolutePath: 'AnotherRoot' })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(2);
              const evt0 = JSON.parse(subscribeTracker[0]);
              const evt1 = JSON.parse(subscribeTracker[1]);
              expect(evt0).to.have.property(subjectEvents.del);
              const evtBody0 = evt0[subjectEvents.del];
              expect(evtBody0).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody0.new).to.have.property('absolutePath', absPath);
              const evtBody1 = evt1[subjectEvents.add];
              expect(evtBody1).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody1.new).to.have.property('absolutePath',
                `AnotherRoot.${absPath}`);
              done();
            });
        });
    });

    it('update name of published subject, subscriber gets remove event ' +
      'then add event', (done) => {
      const absPath = `${tu.namePrefix}PatchName`;
      const newName = `${tu.namePrefix}NewName`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          subscribeTracker = [];

          api.patch(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ name: newName })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(2);
              const evt0 = JSON.parse(subscribeTracker[0]);
              const evt1 = JSON.parse(subscribeTracker[1]);
              expect(evt0).to.have.property(subjectEvents.del);
              const evtBody0 = evt0[subjectEvents.del];
              expect(evtBody0).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody0.new).to.have.property('absolutePath', absPath);
              const evtBody1 = evt1[subjectEvents.add];
              expect(evtBody1).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody1.new).to.have.property('absolutePath', newName);
              done();
            });
        });
    });

    it('update tags of published subject, subscriber gets remove event ' +
      'then add event', (done) => {
      const absPath = `${tu.namePrefix}PatchName`;
      const tags = ['Foo'];

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          subscribeTracker = [];

          api.patch(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ tags })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(2);
              const evt0 = JSON.parse(subscribeTracker[0]);
              const evt1 = JSON.parse(subscribeTracker[1]);
              expect(evt0).to.have.property(subjectEvents.del);
              const evtBody0 = evt0[subjectEvents.del];
              expect(evtBody0).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody0.new).to.have.property('absolutePath', absPath);
              expect(evtBody0.new).to.have.property('tags').to.be.empty;
              const evtBody1 = evt1[subjectEvents.add];
              expect(evtBody1).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody1.new).to.have.property('absolutePath', absPath);
              expect(evtBody1.new).to.have.property('tags')
                .to.deep.equal(tags);
              done();
            });
        });
    });

    it('update description of published subject, subscriber gets update ' +
      'event', (done) => {
      const absPath = `${tu.namePrefix}PatchDesc`;
      const description = 'Cool description!';

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          subscribeTracker = [];

          api.patch(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ description })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt0 = JSON.parse(subscribeTracker[0]);
              expect(evt0).to.have.property(subjectEvents.upd);
              const evtBody0 = evt0[subjectEvents.upd];
              expect(evtBody0).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody0.new).to.have.property('absolutePath', absPath);
              expect(evtBody0.new).to.have.property('description', description);
              done();
            });
        });
    });

    it('update name of unpublished subject, subscriber gets no ' +
      'events', (done) => {
      const absPath = `${tu.namePrefix}PatchUnpublishedName`;
      const newName = `${tu.namePrefix}PatchUnpublishedNewName`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: false })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(0);

          api.patch(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ name: newName })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(0);
              done();
            });
        });
    });
  });

  describe('PUT >', () => {
    it('isPublished true>>false, subscriber gets remove event', (done) => {
      const absPath = `${tu.namePrefix}PutToFalse`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          subscribeTracker = [];

          api.put(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ name: absPath, isPublished: false })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt = JSON.parse(subscribeTracker[0]);
              expect(evt).to.have.property(subjectEvents.del);
              const evtBody = evt[subjectEvents.del];
              expect(evtBody).to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'hierarchyLevel');
              expect(evtBody).to.have.property('absolutePath', absPath);
              done();
            });
        });
    });

    it('isPublished false>>true, subscriber gets add event', (done) => {
      const absPath = `${tu.namePrefix}PutToTrue`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: false })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(0);

          api.put(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ name: absPath, isPublished: true })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt = JSON.parse(subscribeTracker[0]);
              expect(evt).to.have.property(subjectEvents.add);
              const evtBody = evt[subjectEvents.add];
              expect(evtBody).to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'hierarchyLevel');
              expect(evtBody).to.have.property('absolutePath', absPath);
              done();
            });
        });
    });

    it('update parentAbsolutePath of published subject, subscriber ' +
      'gets remove event then add event', (done) => {
      const absPath = `${tu.namePrefix}PutParentAbsPath`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          subscribeTracker = [];

          api.put(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({
              name: absPath,
              parentAbsolutePath: 'AnotherRoot',
              isPublished: true,
            })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(2);
              const evt0 = JSON.parse(subscribeTracker[0]);
              const evt1 = JSON.parse(subscribeTracker[1]);
              expect(evt0).to.have.property(subjectEvents.del);
              const evtBody0 = evt0[subjectEvents.del];
              expect(evtBody0).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody0.new).to.have.property('absolutePath', absPath);
              const evtBody1 = evt1[subjectEvents.add];
              expect(evtBody1).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody1.new).to.have.property('absolutePath',
                `AnotherRoot.${absPath}`);
              done();
            });
        });
    });

    it('update name of published subject, subscriber gets remove event ' +
      'then add event', (done) => {
      const absPath = `${tu.namePrefix}PutName`;
      const newName = `${tu.namePrefix}PutNewName`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          subscribeTracker = [];

          api.put(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ name: newName, isPublished: true })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(2);
              const evt0 = JSON.parse(subscribeTracker[0]);
              const evt1 = JSON.parse(subscribeTracker[1]);
              expect(evt0).to.have.property(subjectEvents.del);
              const evtBody0 = evt0[subjectEvents.del];
              expect(evtBody0).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody0.new).to.have.property('absolutePath', absPath);
              const evtBody1 = evt1[subjectEvents.add];
              expect(evtBody1).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody1.new).to.have.property('absolutePath', newName);
              done();
            });
        });
    });

    it('update tags of published subject, subscriber gets remove event ' +
      'then add event', (done) => {
      const absPath = `${tu.namePrefix}PutName`;
      const tags = ['Foo'];

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          subscribeTracker = [];

          api.put(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ name: absPath, isPublished: true, tags })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(2);
              const evt0 = JSON.parse(subscribeTracker[0]);
              const evt1 = JSON.parse(subscribeTracker[1]);
              expect(evt0).to.have.property(subjectEvents.del);
              const evtBody0 = evt0[subjectEvents.del];
              expect(evtBody0).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody0.new).to.have.property('absolutePath', absPath);
              expect(evtBody0.new).to.have.property('tags').to.be.empty;
              const evtBody1 = evt1[subjectEvents.add];
              expect(evtBody1).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody1.new).to.have.property('absolutePath', absPath);
              expect(evtBody1.new).to.have.property('tags')
                .to.deep.equal(tags);
              done();
            });
        });
    });

    it('update description of published subject, subscriber gets update ' +
      'event', (done) => {
      const absPath = `${tu.namePrefix}PutDesc`;
      const description = 'Cool description!';

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          subscribeTracker = [];

          api.put(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ name: absPath, isPublished: true, description })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt0 = JSON.parse(subscribeTracker[0]);
              expect(evt0).to.have.property(subjectEvents.upd);
              const evtBody0 = evt0[subjectEvents.upd];
              expect(evtBody0).to.have.property('new')
                .to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt',
                'hierarchyLevel');
              expect(evtBody0.new).to.have.property('absolutePath', absPath);
              expect(evtBody0.new).to.have.property('description', description);
              done();
            });
        });
    });

    it('update name of unpublished subject, subscriber gets no ' +
      'events', (done) => {
      const absPath = `${tu.namePrefix}PutUnpublishedName`;
      const newName = `${tu.namePrefix}PutUnpublishedNewName`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: false })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(0);

          api.put(`${path}/${absPath}`)
            .set('Authorization', token)
            .send({ name: newName, isPublished: false })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(0);
              done();
            });
        });
    });
  });

  describe('DELETE >', () => {
    it('delete published subject, subscriber gets remove event', (done) => {
      const absPath = `${tu.namePrefix}DeletePublished`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(subjectEvents.add);
          subscribeTracker = [];

          api.delete(`${path}/${absPath}`)
            .set('Authorization', token)
            .send()
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt = JSON.parse(subscribeTracker[0]);
              expect(evt).to.have.property(subjectEvents.del);
              const evtBody = evt[subjectEvents.del];
              expect(evtBody).to.include.keys('absolutePath', 'childCount',
                'id', 'relatedLinks', 'tags', 'sortBy', 'name', 'isPublished',
                'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'hierarchyLevel');
              expect(evtBody).to.have.property('absolutePath', absPath);
              done();
            });
        });
    });

    it('delete unpublished subject, subscriber gets no events', (done) => {
      const absPath = `${tu.namePrefix}DeleteUnpublished`;

      api.post(path)
        .set('Authorization', token)
        .send({ name: absPath, isPublished: false })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(0);

          api.delete(`${path}/${absPath}`)
            .set('Authorization', token)
            .send()
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(0);
              done();
            });
        });
    });
  });
});
