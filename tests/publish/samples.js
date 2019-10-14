/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/publish/samples.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const supertest = require('supertest');
const redis = require('redis');
const Promise = require('bluebird');
const rconf = require('../../config/redisConfig');
const api = supertest(require('../../express').app);
const tu = require('../testUtils');
const aspectEvents = require('../../realtime/constants').events.aspect;
const sampleEvents = require('../../realtime/constants').events.sample;
const subjectEvents = require('../../realtime/constants').events.subject;
const samstoinit = require('../../cache/sampleStoreInit');
const doTimeout = require('../../cache/sampleStoreTimeout').doTimeout;
const DEFAULT_LOCAL_REDIS_URL = '//127.0.0.1:6379';

const addSubject = (name, token) => api.post('/v1/subjects')
  .set('Authorization', token)
  .send({ name, isPublished: true })
  .then(() => api.get(`/v1/subjects/${name}`).set('Authorization', token));

const addAspect = (name, token, timeout = '1h') => api.post('/v1/aspects')
  .set('Authorization', token)
  .send({
    name,
    timeout,
    isPublished: true,
    criticalRange: [0, 0],
    tags: ['aspTag1', 'aspTag2'],
  })
  .then(() => api.get(`/v1/aspects/${name}`).set('Authorization', token));

const upsertSample = (name, token) => api.post('/v1/samples/upsert')
  .set('Authorization', token)
  .send({
    name,
    value: '1',
    relatedLinks: [
      { name: 'a', url: 'a.com' },
      { name: 'b', url: 'b.com' },
      { name: 'c', url: 'c.com' },
    ],
  })
  .then(() => api.get(`/v1/samples/${name}`).set('Authorization', token));

describe('tests/publish/samples.js >', () => {
  let token;
  let subscriber;
  let subscribeTracker = [];
  const sampleAttributes = [
    'createdAt',
    'user',
    'status',
    'name',
    'relatedLinks',
    'provider',
    'updatedAt',
    'previousStatus',
    'statusChangedAt',
    'value',
    'absolutePath',
    'aspect',
    'subject',
  ];

  function checkSampleAspSubjAttr(sample) {
    expect(sample.aspect).to.have.all.keys('name', 'tags');
    expect(sample.subject).to.have.all.keys('absolutePath', 'tags');
  }

  function checkSampleAttributes(sample) {
    expect(sample).to.have.all.keys(...sampleAttributes);
    checkSampleAspSubjAttr(sample);
  }

  function resetSubscribeTracking() {
    subscribeTracker = [];
  }

  function awaitSubscribeMessages() {
    return new Promise((resolve) => {
      if (subscribeTracker.length) {
        resolve(subscribeTracker);
      } else {
        subscriber.on('message', () => resolve(subscribeTracker));
      }
    })
    .timeout(100);
  }

  before((done) => {
    before(() => tu.toggleOverride('enableRedisSampleStore', true));
    subscriber = redis.createClient(DEFAULT_LOCAL_REDIS_URL);
    subscriber.subscribe(rconf.perspectiveChannelName);
    subscriber.on('message', (channel, msg) => subscribeTracker.push(msg));

    samstoinit.eradicate()
      .then(() => tu.createToken())
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
  });

  after(() => tu.forceDelete(tu.db.Subject)
    .then(() => tu.forceDelete(tu.db.Aspect))
    .then(() => tu.forceDelete(tu.db.User))
    .then(() => tu.forceDelete(tu.db.Profile))
    .then(() => samstoinit.eradicate()));

  afterEach(resetSubscribeTracking);

  describe('delete aspect >', () => {
    before(() => addSubject(`${tu.namePrefix}S1`, token)
      .then(() => addSubject(`${tu.namePrefix}S2`, token))
      .then(() => addAspect(`${tu.namePrefix}A1`, token))
      .then(() => upsertSample(`${tu.namePrefix}S1|${tu.namePrefix}A1`, token))
      .then(() => upsertSample(`${tu.namePrefix}S2|${tu.namePrefix}A1`, token))
      .then(() => resetSubscribeTracking()));

    it('one sample.remove event per sample for the deleted aspect', (done) => {
      api.delete(`/v1/aspects/${tu.namePrefix}A1`)
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(3);

            const s0 = JSON.parse(messages[0]);
            expect(s0).to.have.property(aspectEvents.del);

            const s1 = JSON.parse(subscribeTracker[1]);
            expect(s1).to.have.property(sampleEvents.del);
            const s1Body = s1[sampleEvents.del];
            checkSampleAttributes(s1Body);

            const s2 = JSON.parse(subscribeTracker[2]);
            expect(s2).to.have.property(sampleEvents.del);
            const s2Body = s2[sampleEvents.del];
            checkSampleAttributes(s2Body);
            done();
          })
          .catch(done);
        });
    });
  });

  describe('patch aspect >', () => {
    before(() => addSubject(`${tu.namePrefix}S3`, token)
      .then(() => addAspect(`${tu.namePrefix}A2`, token))
      .then(() => upsertSample(`${tu.namePrefix}S3|${tu.namePrefix}A2`, token))
      .then(() => resetSubscribeTracking()));

    it('edit tags, sample.remove followed by sample.add', (done) => {
      api.patch(`/v1/aspects/${tu.namePrefix}A2`)
        .set('Authorization', token)
        .send({ tags: ['T1'] })
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(subscribeTracker).to.have.length(4);
            let sampDelEvent = null;
            let aspDelEvent = null;
            let aspAddEvent = null;
            let sampAddEvent = null;
            subscribeTracker.forEach((e) => {
              const event = JSON.parse(e);
              if (event.hasOwnProperty(sampleEvents.del)) {
                sampDelEvent = event;
              } else if (event.hasOwnProperty(aspectEvents.del)) {
                aspDelEvent = event;
              } else if (event.hasOwnProperty(aspectEvents.add)) {
                aspAddEvent = event;
                expect(aspDelEvent).to.not.be.null;
              } else if (event.hasOwnProperty(sampleEvents.add)) {
                sampAddEvent = event;
                expect(sampDelEvent).to.not.be.null;
              }
            });

            expect(aspDelEvent).to.not.be.null;
            expect(aspAddEvent).to.not.be.null;
            const sampDelBody = sampDelEvent[sampleEvents.del];
            expect(sampDelBody).to.have.all.keys(...sampleAttributes);
            const sampAddBody = sampAddEvent[sampleEvents.add];
            expect(sampAddBody).to.have.all.keys(...sampleAttributes);
            done();
          })
          .catch(done);
        });
    });

    it('do not edit tags, no events', (done) => {
      api.patch(`/v1/aspects/${tu.namePrefix}A2`)
        .set('Authorization', token)
        .send({ description: 'I have updated the description' })
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(1);
            const s0 = JSON.parse(messages[0]);
            expect(s0).to.have.property(aspectEvents.upd);
            done();
          })
          .catch(done);
        });
    });
  });

  describe('delete subject >', () => {
    before(() => addSubject(`${tu.namePrefix}S9`, token)
      .then(() => addAspect(`${tu.namePrefix}A9`, token))
      .then(() => addAspect(`${tu.namePrefix}A10`, token))
      .then(() => upsertSample(`${tu.namePrefix}S9|${tu.namePrefix}A9`, token))
      .then(() =>
        upsertSample(`${tu.namePrefix}S9|${tu.namePrefix}A10`, token))
      .then(() => resetSubscribeTracking()));

    it('one sample.remove event per sample for deleted subject', (done) => {
      api.delete(`/v1/subjects/${tu.namePrefix}S9`)
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(3);
            const sampDelEvents = [];
            let subjDelEvent = null;
            subscribeTracker.forEach((e) => {
              const event = JSON.parse(e);
              if (event.hasOwnProperty(sampleEvents.del)) {
                sampDelEvents.push(event);
              } else if (event.hasOwnProperty(subjectEvents.del)) {
                subjDelEvent = event;
              }
            });

            sampDelEvents.forEach((sampDelEvent) => {
              checkSampleAttributes(sampDelEvent[sampleEvents.del]);
            });

            const subjDelBody = subjDelEvent[subjectEvents.del];
            expect(subjDelBody).to.have.property(
              'absolutePath', `${tu.namePrefix}S9`);
            done();
          })
          .catch(done);
        });
    });
  });

  describe('patch subject >', () => {
    beforeEach(() => addSubject(`${tu.namePrefix}S10`, token)
      .then(() => addSubject(`${tu.namePrefix}S11`, token)
      .then(() => addAspect(`${tu.namePrefix}A11`, token))
      .then(() =>
        upsertSample(`${tu.namePrefix}S10|${tu.namePrefix}A11`, token)))
      .then(() => resetSubscribeTracking()));

    afterEach(() => tu.forceDelete(tu.db.Subject)
      .then(() => tu.forceDelete(tu.db.Aspect)));

    it('isPublished true>>false, subscriber gets sample remove event and ' +
      'subject remove event, then update false to true and get subject add ' +
      'but no sample events', (done) => {
      api.patch(`/v1/subjects/${tu.namePrefix}S10`, token)
        .set('Authorization', token)
        .send({ isPublished: false })
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(2);
            const s0 = JSON.parse(messages[0]);
            expect(s0).to.have.property(sampleEvents.del);

            const s1 = JSON.parse(messages[1]);
            expect(s1).to.have.property(subjectEvents.del);

            resetSubscribeTracking();

            api.patch(`/v1/subjects/${tu.namePrefix}S10`, token)
            .set('Authorization', token)
            .send({ isPublished: true })
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              awaitSubscribeMessages()
              .then((messages) => {
                expect(messages).to.have.length(1);
                const s0 = JSON.parse(messages[0]);
                expect(s0).to.have.property(subjectEvents.add);

                done();
              })
              .catch(done);
            });
          })
          .catch(done);
        });
    });

    it('update parentAbsolutePath of published subject, subscriber gets ' +
      'sample remove event, subject remove event, subject add ' +
      'event', (done) => {
      api.patch(`/v1/subjects/${tu.namePrefix}S10`, token)
        .set('Authorization', token)
        .send({ parentAbsolutePath: `${tu.namePrefix}S11` })
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(3);
            const s0 = JSON.parse(messages[0]);
            expect(s0).to.have.property(sampleEvents.del);

            const s1 = JSON.parse(messages[1]);
            expect(s1).to.have.property(subjectEvents.del);

            const s2 = JSON.parse(messages[2]);
            expect(s2).to.have.property(subjectEvents.add);

            done();
          })
          .catch(done);
        });
    });

    it('update name of published subject, subscriber gets sample remove ' +
      'event, subject remove event, subject add event', (done) => {
      api.patch(`/v1/subjects/${tu.namePrefix}S10`, token)
        .set('Authorization', token)
        .send({ name: `${tu.namePrefix}S10b` })
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(3);
            const s0 = JSON.parse(messages[0]);
            expect(s0).to.have.property(sampleEvents.del);

            const s1 = JSON.parse(messages[1]);
            expect(s1).to.have.property(subjectEvents.del);

            const s2 = JSON.parse(messages[2]);
            expect(s2).to.have.property(subjectEvents.add);

            done();
          })
          .catch(done);
        });
    });

    it('update tags of published subject, subscriber gets sample remove ' +
      'event, subject remove event, subject add event', (done) => {
      api.patch(`/v1/subjects/${tu.namePrefix}S10`, token)
        .set('Authorization', token)
        .send({ tags: ['t1', 't2'] })
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(3);
            const foundEvents = messages.map((st) =>
              Object.keys(JSON.parse(st))[0]);
            expect(foundEvents).to.include.members([
              'refocus.internal.realtime.subject.remove',
              'refocus.internal.realtime.subject.add',
              'refocus.internal.realtime.sample.remove',
            ]);
            done();
          })
          .catch(done);
        });
    });

    it('update description of published subject, subscriber gets update ' +
      'event, no sample events', (done) => {
      api.patch(`/v1/subjects/${tu.namePrefix}S10`, token)
        .set('Authorization', token)
        .send({ description: 'Updated' })
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(1);
            const s0 = JSON.parse(messages[0]);
            expect(s0).to.have.property(subjectEvents.upd);
            done();
          })
          .catch(done);
        });
    });

    it('update name of unpublished subject, subscriber gets no ' +
      'subject or sample events', (done) => {
      api.patch(`/v1/subjects/${tu.namePrefix}S10`, token)
        .set('Authorization', token)
        .send({ isPublished: false })
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(2);
            resetSubscribeTracking();

            api.patch(`/v1/subjects/${tu.namePrefix}S10`, token)
            .set('Authorization', token)
            .send({ name: `${tu.namePrefix}S10b` })
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              return awaitSubscribeMessages()
              .catch((err) => {
                expect(err).to.be.an.instanceof(Promise.TimeoutError);
                done();
              });
            });
          })
          .catch(done);
        });
    });
  });

  describe('post sample >', () => {
    let subj;
    let asp;
    before(() => addSubject(`${tu.namePrefix}S4`, token)
      .then((s) => (subj = s.body))
      .then(() => addAspect(`${tu.namePrefix}A3`, token))
      .then((a) => (asp = a.body))
      .then(() => resetSubscribeTracking()));

    it('sample.add event', (done) => {
      api.post('/v1/samples', token)
        .set('Authorization', token)
        .send({ subjectId: subj.id, aspectId: asp.id})
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
          expect(messages).to.have.length(1);
          const s0 = JSON.parse(messages[0]);
          expect(s0).to.have.property(sampleEvents.add);
          const s0Body = s0[sampleEvents.add];
          expect(s0Body).to.have.all.keys(...sampleAttributes,
            'aspectId', 'subjectId');
          expect(s0Body.aspect).to.have.all.keys('name', 'tags');
          expect(s0Body.subject).to.have.all.keys('absolutePath', 'tags');
            done();
          })
          .catch(done);
        });
    });
  });

  describe('upsert sample >', () => {
    before(() => addSubject(`${tu.namePrefix}S5`, token)
      .then(() => addAspect(`${tu.namePrefix}A4`, token))
      .then(() => addAspect(`${tu.namePrefix}A5`, token))
      .then(() => upsertSample(`${tu.namePrefix}S5|${tu.namePrefix}A5`, token))
      .then(() => resetSubscribeTracking()));

    it('new sample, sample.add event', (done) => {
      upsertSample(`${tu.namePrefix}S5|${tu.namePrefix}A4`, token)
        .then(() => {
          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(1);
            const s0 = JSON.parse(messages[0]);
            expect(s0).to.have.property(sampleEvents.add);
            const s0Body = s0[sampleEvents.add];
            expect(s0Body).to.have.all.keys(...sampleAttributes);
            done();
          })
          .catch(done);
        });
    });

    it('sample.update event, sample.nochange event', (done) => {
      api.post('/v1/samples/upsert')
        .set('Authorization', token)
        .send({
          name: `${tu.namePrefix}S5|${tu.namePrefix}A5`,
          value: '0',
        })
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(1);
            const s0 = JSON.parse(messages[0]);
            expect(s0).to.have.property(sampleEvents.upd);
            const s0Body = s0[sampleEvents.upd];
            expect(s0Body).to.have.all.keys(...sampleAttributes);
            resetSubscribeTracking();

            api.post('/v1/samples/upsert')
            .set('Authorization', token)
            .send({
              name: `${tu.namePrefix}S5|${tu.namePrefix}A5`,
              value: '0',
            })
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              awaitSubscribeMessages()
              .then((messages) => {
                expect(messages).to.have.length(1);
                const sNC = JSON.parse(messages[0]);
                expect(sNC).to.have.property(sampleEvents.nc);
                const sNCBody = sNC[sampleEvents.nc];
                expect(sNCBody).to.have.all.keys('name', 'status', 'updatedAt',
                  'absolutePath', 'aspect', 'subject');
                checkSampleAspSubjAttr(sNCBody);
                done();
              });
            });
          })
          .catch(done);
        });
    });
  });

  describe('sample timeout >', () => {
    let mockUpdatedAt;
    before(() => addSubject(`${tu.namePrefix}S8`, token)
      .then(() => addAspect(`${tu.namePrefix}A8`, token, '9m'))
      .then(() => upsertSample(`${tu.namePrefix}S8|${tu.namePrefix}A8`, token))
      .then((samp) => {
        mockUpdatedAt = new Date(samp.body.updatedAt);
        mockUpdatedAt.setMinutes(mockUpdatedAt.getMinutes() + 20);
      })
      .then(() => resetSubscribeTracking()));

    it('got sample.update event', (done) => {

      doTimeout(mockUpdatedAt)
        .then((timeoutResponse) => {
          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(1);
            const s0 = JSON.parse(messages[0]);
            expect(s0).to.have.property(sampleEvents.upd);
            const s0Body = s0[sampleEvents.upd];
            expect(s0Body).to.have.all.keys(...sampleAttributes);
            expect(s0Body).to.have.property('status', 'Timeout');
          })
          .catch(done);
        })
        .then(() => done())
        .catch(done);
    });
  });

  describe('delete one sample related link', () => {
    before(() => addSubject(`${tu.namePrefix}S6`, token)
      .then(() => addAspect(`${tu.namePrefix}A6`, token))
      .then(() => upsertSample(`${tu.namePrefix}S6|${tu.namePrefix}A6`, token))
      .then(() => resetSubscribeTracking()));

    it('sample update event', (done) => {
      const pth =
        `/v1/samples/${tu.namePrefix}S6|${tu.namePrefix}A6/relatedLinks/a`;
      api.delete(pth)
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(1);
            const s0 = JSON.parse(messages[0]);
            expect(s0).to.have.property(sampleEvents.upd);
            const s0Body = s0[sampleEvents.upd];
            expect(s0Body).to.have.all.keys(...sampleAttributes, 'apiLinks');
            expect(s0Body.relatedLinks).to.deep.equal([
              { name: 'b', url: 'b.com' },
              { name: 'c', url: 'c.com' },
            ]);
            done();
          })
          .catch(done);
        });
    });
  });

  describe('delete all sample related links', () => {
    before(() => addSubject(`${tu.namePrefix}S7`, token)
      .then(() => addAspect(`${tu.namePrefix}A7`, token))
      .then(() => upsertSample(`${tu.namePrefix}S7|${tu.namePrefix}A7`, token))
      .then(() => resetSubscribeTracking()));

    it('sample update event', (done) => {
      const pth =
        `/v1/samples/${tu.namePrefix}S7|${tu.namePrefix}A7/relatedLinks`;
      api.delete(pth)
        .set('Authorization', token)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          awaitSubscribeMessages()
          .then((messages) => {
            expect(messages).to.have.length(1);
            const s0 = JSON.parse(messages[0]);
            expect(s0).to.have.property(sampleEvents.upd);
            const s0Body = s0[sampleEvents.upd];
            expect(s0Body).to.have.all.keys(...sampleAttributes, 'apiLinks');
            expect(s0Body.relatedLinks).to.deep.equal([]);
            done();
          })
          .catch(done);
        });
    });
  });
});
