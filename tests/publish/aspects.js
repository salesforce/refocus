/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/publish/aspects.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const supertest = require('supertest');
const redis = require('redis');
const rconf = require('../../config/redisConfig');
const constants = require('../../api/v1/constants');
const api = supertest(require('../../express').app);
const tu = require('../testUtils');
const Aspect = tu.db.Aspect;
const redisPublisher = require('../../realtime/redisPublisher');
const aspectEvents = require('../../realtime/constants').events.aspect;
const path = '/v1/aspects';
const DEFAULT_LOCAL_REDIS_URL = '//127.0.0.1:6379';

describe('tests/publish/aspects.js >', () => {
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
          .send({ name: 'AnotherAspect', timeout: '1m', isPublished: true })
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

  after(() => tu.forceDelete(tu.db.Aspect)
    .then(() => tu.forceDelete(tu.db.User))
    .then(() => tu.forceDelete(tu.db.Profile)));

  afterEach(() => subscribeTracker = []);

  describe('POST >', () => {
    it('isPublished true, subscriber gets add event', (done) => {
      const name = `${tu.namePrefix}PostPublished`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(aspectEvents.add);
          const evtBody = evt[aspectEvents.add];
          expect(evtBody).to.include.keys('createdAt', 'createdBy',
            'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
            'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
            'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout', 'updatedAt',
            'valueLabel', 'valueType', 'warningRange');
          expect(evtBody).to.have.property('name', name);
          expect(evtBody).to.have.property('isPublished', true);
          done();
        });
    });

    it('isPublished false, subscriber gets no events', (done) => {
      const name = `${tu.namePrefix}PostUnpublished`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: false })
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
      const name = `${tu.namePrefix}PatchToFalse`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(aspectEvents.add);
          subscribeTracker = [];

          api.patch(`${path}/${name}`)
            .set('Authorization', token)
            .send({ isPublished: false })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt = JSON.parse(subscribeTracker[0]);
              expect(evt).to.have.property(aspectEvents.del);
              const evtBody = evt[aspectEvents.del];
              expect(evtBody).to.include.keys('createdAt', 'createdBy',
                'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                'updatedAt', 'valueLabel', 'valueType', 'warningRange');
              expect(evtBody).to.have.property('name', name);
              expect(evtBody).to.have.property('isPublished', false);
              done();
            });
        });
    });

    it('isPublished false>>true, subscriber gets add event', (done) => {
      const name = `${tu.namePrefix}PatchToTrue`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: false })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(0);

          api.patch(`${path}/${name}`)
            .set('Authorization', token)
            .send({ isPublished: true })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt = JSON.parse(subscribeTracker[0]);
              expect(evt).to.have.property(aspectEvents.add);
              const evtBody = evt[aspectEvents.add];
              expect(evtBody).to.include.keys('createdAt', 'createdBy',
                'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                'updatedAt', 'valueLabel', 'valueType', 'warningRange');
              expect(evtBody).to.have.property('name', name);
              expect(evtBody).to.have.property('isPublished', true);
              done();
            });
        });
    });

    it('update name of published aspect, subscriber gets remove event ' +
      'then add event', (done) => {
      const name = `${tu.namePrefix}PatchName`;
      const newName = `${tu.namePrefix}NewName`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(aspectEvents.add);
          subscribeTracker = [];

          api.patch(`${path}/${name}`)
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
              expect(evt0).to.have.property(aspectEvents.del);
              const evtBody0 = evt0[aspectEvents.del];
              expect(evtBody0).to.include.keys('createdAt', 'createdBy',
                'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                'updatedAt', 'valueLabel', 'valueType', 'warningRange');
              expect(evtBody0).to.have.property('name', name);
              const evtBody1 = evt1[aspectEvents.add];
              expect(evtBody1).to.include.keys('createdAt', 'createdBy',
                'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                'updatedAt', 'valueLabel', 'valueType', 'warningRange');
              expect(evtBody1).to.have.property('name', newName);
              done();
            });
        });
    });

    it('update tags of published aspect, subscriber gets remove then add',
      (done) => {
        const name = `${tu.namePrefix}PatchTags`;
        const tags = ['Foo'];

        api.post(path)
          .set('Authorization', token)
          .send({ name, timeout: '1m', isPublished: true })
          .expect(constants.httpStatus.CREATED)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(subscribeTracker).to.have.length(1);
            const evt = JSON.parse(subscribeTracker[0]);
            expect(evt).to.have.property(aspectEvents.add);
            subscribeTracker = [];

            api.patch(`${path}/${name}`)
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
                expect(evt0).to.have.property(aspectEvents.del);
                const evtBody0 = evt0[aspectEvents.del];
                expect(evtBody0).to.include.keys('createdAt', 'createdBy',
                  'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                  'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                  'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                  'updatedAt', 'valueLabel', 'valueType', 'warningRange');
                expect(evtBody0).to.have.property('name', name);
                expect(evtBody0).to.have.property('tags')
                  .to.deep.equal([]);
                const evtBody1 = evt1[aspectEvents.add];
                expect(evtBody1).to.include.keys('createdAt', 'createdBy',
                  'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                  'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                  'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                  'updatedAt', 'valueLabel', 'valueType', 'warningRange');
                expect(evtBody1).to.have.property('tags')
                  .to.deep.equal(['Foo']);
                done();
              });
          });
      });

    it('update description of published aspect, subscriber gets update ' +
      'event', (done) => {
      const name = `${tu.namePrefix}PatchDesc`;
      const description = 'Cool description!';

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(aspectEvents.add);
          subscribeTracker = [];

          api.patch(`${path}/${name}`)
            .set('Authorization', token)
            .send({ description })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt = JSON.parse(subscribeTracker[0]);
              expect(evt).to.have.property(aspectEvents.upd);
              const evtBody = evt[aspectEvents.upd];
              expect(evtBody).to.have.property('new')
                .to.include.keys('createdAt', 'createdBy',
                'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                'updatedAt', 'valueLabel', 'valueType', 'warningRange');
              expect(evtBody.new).to.have.property('name', name);
              expect(evtBody.new).to.have.property('description', description);
              done();
            });
        });
    });

    it('update name of unpublished aspect, subscriber gets no ' +
      'events', (done) => {
      const name = `${tu.namePrefix}PatchUnpublishedName`;
      const newName = `${tu.namePrefix}PatchUnpublishedNewName`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: false })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(0);

          api.patch(`${path}/${name}`)
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
      const name = `${tu.namePrefix}PutToFalse`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(aspectEvents.add);
          subscribeTracker = [];

          api.put(`${path}/${name}`)
            .set('Authorization', token)
            .send({ name, timeout: '1m', isPublished: false })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt = JSON.parse(subscribeTracker[0]);
              expect(evt).to.have.property(aspectEvents.del);
              const evtBody = evt[aspectEvents.del];
              expect(evtBody).to.include.keys('createdAt', 'createdBy',
                'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                'updatedAt', 'valueLabel', 'valueType', 'warningRange');
              expect(evtBody).to.have.property('name', name);
              done();
            });
        });
    });

    it('isPublished false>>true, subscriber gets add event', (done) => {
      const name = `${tu.namePrefix}PutToTrue`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: false })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(0);

          api.put(`${path}/${name}`)
            .set('Authorization', token)
            .send({ name: name, timeout: '1m', isPublished: true })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt = JSON.parse(subscribeTracker[0]);
              expect(evt).to.have.property(aspectEvents.add);
              const evtBody = evt[aspectEvents.add];
              expect(evtBody).to.include.keys('createdAt', 'createdBy',
                'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                'updatedAt', 'valueLabel', 'valueType', 'warningRange');
              expect(evtBody).to.have.property('name', name);
              done();
            });
        });
    });

    it('update name of published aspect, subscriber gets remove event ' +
      'then add event', (done) => {
      const name = `${tu.namePrefix}PutName`;
      const newName = `${tu.namePrefix}PutNewName`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(aspectEvents.add);
          subscribeTracker = [];

          api.put(`${path}/${name}`)
            .set('Authorization', token)
            .send({ name: newName, timeout: '1m', isPublished: true })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(2);
              const evt0 = JSON.parse(subscribeTracker[0]);
              const evt1 = JSON.parse(subscribeTracker[1]);
              expect(evt0).to.have.property(aspectEvents.del);
              const evtBody0 = evt0[aspectEvents.del];
              expect(evtBody0).to.include.keys('createdAt', 'createdBy',
                'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                'updatedAt', 'valueLabel', 'valueType', 'warningRange');
              expect(evtBody0).to.have.property('name', name);
              const evtBody1 = evt1[aspectEvents.add];
              expect(evtBody1).to.include.keys('createdAt', 'createdBy',
                'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                'updatedAt', 'valueLabel', 'valueType', 'warningRange');
              expect(evtBody1).to.have.property('name', newName);
              done();
            });
        });
    });

    it('update tags of published aspect, subscriber gets remove then add',
      (done) => {
        const name = `${tu.namePrefix}PutName`;
        const tags = ['Foo'];

        api.post(path)
          .set('Authorization', token)
          .send({ name, timeout: '1m', isPublished: true })
          .expect(constants.httpStatus.CREATED)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(subscribeTracker).to.have.length(1);
            const evt = JSON.parse(subscribeTracker[0]);
            expect(evt).to.have.property(aspectEvents.add);
            subscribeTracker = [];

            api.put(`${path}/${name}`)
              .set('Authorization', token)
              .send({ name, timeout: '1m', isPublished: true, tags })
              .expect(constants.httpStatus.OK)
              .end((_err, _res) => {
                if (_err) {
                  return done(err);
                }

                expect(subscribeTracker).to.have.length(2);
                const evt0 = JSON.parse(subscribeTracker[0]);
                const evt1 = JSON.parse(subscribeTracker[1]);
                expect(evt0).to.have.property(aspectEvents.del);
                const evtBody0 = evt0[aspectEvents.del];
                expect(evtBody0).to.include.keys('createdAt', 'createdBy',
                  'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                  'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                  'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                  'updatedAt', 'valueLabel', 'valueType', 'warningRange');
                expect(evtBody0).to.have.property('name', name);
                expect(evtBody0).to.have.property('tags')
                  .to.deep.equal([]);
                const evtBody1 = evt1[aspectEvents.add];
                expect(evtBody1).to.include.keys('createdAt', 'createdBy',
                  'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                  'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                  'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                  'updatedAt', 'valueLabel', 'valueType', 'warningRange');
                expect(evtBody1).to.have.property('tags')
                  .to.deep.equal(['Foo']);
                done();
              });
          });
      });

    it('update description of published aspect, subscriber gets update ' +
      'event', (done) => {
      const name = `${tu.namePrefix}PutDesc`;
      const description = 'Cool description!';

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(aspectEvents.add);
          subscribeTracker = [];

          api.put(`${path}/${name}`)
            .set('Authorization', token)
            .send({ name: name, isPublished: true, description })
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt0 = JSON.parse(subscribeTracker[0]);
              expect(evt0).to.have.property(aspectEvents.upd);
              const evtBody0 = evt0[aspectEvents.upd];
              expect(evtBody0).to.have.property('new')
                .to.include.keys('createdAt', 'createdBy',
                'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                'updatedAt', 'valueLabel', 'valueType', 'warningRange');
              expect(evtBody0.new).to.have.property('name', name);
              expect(evtBody0.new).to.have.property('description', description);
              done();
            });
        });
    });

    it('update name of unpublished aspect, subscriber gets no ' +
      'events', (done) => {
      const name = `${tu.namePrefix}PutUnpublishedName`;
      const newName = `${tu.namePrefix}PutUnpublishedNewName`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: false })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(0);

          api.put(`${path}/${name}`)
            .set('Authorization', token)
            .send({ name: newName, timeout: '1m', isPublished: false })
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
    it('delete published aspect, subscriber gets remove event', (done) => {
      const name = `${tu.namePrefix}DeletePublished`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: true })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(aspectEvents.add);
          subscribeTracker = [];

          api.delete(`${path}/${name}`)
            .set('Authorization', token)
            .send()
            .expect(constants.httpStatus.OK)
            .end((_err, _res) => {
              if (_err) {
                return done(_err);
              }

              expect(subscribeTracker).to.have.length(1);
              const evt = JSON.parse(subscribeTracker[0]);
              expect(evt).to.have.property(aspectEvents.del);
              const evtBody = evt[aspectEvents.del];
              expect(evtBody).to.include.keys('createdAt', 'createdBy',
                'criticalRange', 'description', 'helpEmail', 'helpUrl', 'id',
                'imageUrl', 'infoRange', 'isPublished', 'name', 'okRange',
                'ownerId', 'rank', 'relatedLinks', 'tags', 'timeout',
                'updatedAt', 'valueLabel', 'valueType', 'warningRange');
              expect(evtBody).to.have.property('name', name);
              done();
            });
        });
    });

    it('delete unpublished aspect, subscriber gets no events', (done) => {
      const name = `${tu.namePrefix}DeleteUnpublished`;

      api.post(path)
        .set('Authorization', token)
        .send({ name, timeout: '1m', isPublished: false })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(0);

          api.delete(`${path}/${name}`)
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
