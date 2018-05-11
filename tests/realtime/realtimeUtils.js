/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/realtime/realtimeUtils.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const realtimeUtils = require('../../realtime/utils');
const tu = require('../testUtils');
const u = require('./utils');

describe('tests/realtime/realtimeUtils.js, realtime utils Tests >', () => {
  const rootSubjNA = tu.namePrefix + 'NA';
  const rootSubjNAUS = rootSubjNA + '.US';
  const rootSubjNAUSCA = rootSubjNA + '.CA';
  const newSubject = {
    absolutePath: rootSubjNAUSCA + '.SF',
    name: 'SF',
  };
  const rootSubjNAObj = {
    name: rootSubjNA,
    isPublished: true,
    tags: ['ea'],
    relatedLinks: [
        { name: 'population', value: 'http://popl.io' },
    ],
  };

  const updatedSubject = {
    new: {
      absolutePath: rootSubjNAUSCA + '.SF',
      name: 'SF',
      helpurl: 'helpme.com',
    },
    old: {
      absolutePath: rootSubjNAUSCA + '.SF',
      name: 'SF',
      helpurl: '',
    },
  };
  const aspectOne = {
    name: tu.namePrefix + 'temperature',
    timeout: '30s',
    okRange: [1, 5],
    isPublished: true,
    tags: ['temp'],
  };

  const sampleToCreateNA = {
    value: '2',
    name: rootSubjNA + '|' + aspectOne.name,
  };

  const looksLikeSampleObjNAUS = {
    value: '1',
    name: rootSubjNAUS + '|' + aspectOne.name,
    absolutePath: rootSubjNAUS,
    status: 'INVALID',
    aspect: aspectOne,
    subject: {
      tags: ['ea'],
    },
  };
  let persRootNAUS;
  let persRootNA;
  let persRootNAUSCA;
  let roomTest;
  let roomID;
  let botID;
  let botActionTest;
  let botEventTest;
  let botDataTest;
  let createdLensId;
  let sampleInstNA;
  before((done) => {
    tu.db.Aspect.create(aspectOne)
    .then(() => tu.db.Subject.create(rootSubjNAObj))
    .then(() => tu.Sample.upsertByName(sampleToCreateNA))
    .then((sample) => {
      sampleInstNA = sample;
      /*
       * Attach absolutePath and subject object to the sample to make it a
       * complete object for publishing.
       */
      sampleInstNA.absolutePath = rootSubjNA;
      sampleInstNA.subject = rootSubjNAObj;
    })
    .then(() => u.doSetup())
    .then((createdLens) => {
      createdLensId = createdLens.id;
    })
    .then(() => tu.db.Perspective.create({
      name: `${tu.namePrefix}firstPersp`,
      lensId: createdLensId,
      rootSubject: rootSubjNAUS,
    }))
    .then((pers1) => {
      persRootNAUS = pers1;
      return tu.db.Perspective.create({
        name: `${tu.namePrefix}secondPersp`,
        lensId: createdLensId,
        rootSubject: rootSubjNA,
        aspectFilter: [aspectOne.name, 'humidity'],
        aspectFilterType: 'INCLUDE',
        aspectTagFilter: ['temp', 'hum'],
        aspectTagFilterType: 'INCLUDE',
        subjectTagFilter: ['ea', rootSubjNA],
        subjectTagFilterType: 'INCLUDE',
        statusFilter: ['OK'],
        statusFilterType: 'INCLUDE',
      });
    })
    .then((pers2) => {
      persRootNA = pers2;
      return tu.db.Perspective.create({
        name: `${tu.namePrefix}thirdPersp`,
        lensId: createdLensId,
        rootSubject: rootSubjNAUSCA,
        aspectFilter: [aspectOne.name, 'humidity'],
        statusFilter: ['OK'],
      });
    })
    .then((pers3) => {
      persRootNAUSCA = pers3;
      return tu.db.RoomType.create(u.getStandardRoomType());
    })
    .then((roomType) => {
      const room = u.getStandardRoom();
      room.type = roomType.id;
      return tu.db.Room.create(room);
    })
    .then((room) => {
      roomID = room.id;
      roomTest = room.toJSON();
    })
    .then(() => {
      const bot = u.getStandardBot();
      return tu.db.Bot.create(bot);
    })
    .then((bot) => {
      botID = bot.id;
      const botAction = u.getStandardBotAction();
      botAction.roomId = roomID;
      botAction.botId = botID;
      return tu.db.BotAction.create(botAction);
    })
    .then((ba) => {
      botActionTest = ba.toJSON();
    })
    .then(() => {
      const botEvent = u.getStandardEvent();
      return tu.db.Event.create(botEvent);
    })
    .then((event) => {
      botEventTest = event.toJSON();
      const botData = u.getStandardBotData();
      botData.roomId = roomID;
      botData.botId = botID;
      return tu.db.BotData.create(botData);
    })
    .then((bd) => {
      botDataTest = bd.toJSON();
    }).then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  describe('utility function tests >', () => {
    describe('shouldIEmitThisObject functon tests >', () => {
      it('should return false for some randomSubjectRoot', () => {
        const nspString = '/SomRadomSubjectRoo';
        expect(realtimeUtils.shouldIEmitThisObj(nspString, rootSubjNAUS))
          .to.equal(false);
      });

      it('should return true for pers rootNA', () => {
        const nspString = realtimeUtils
          .getPerspectiveNamespaceString(persRootNA);
        expect(realtimeUtils
          .shouldIEmitThisObj(nspString, sampleInstNA))
          .to.equal(true);
      });

      it('should return true for pers rootNAUS', () => {
        const nspString = realtimeUtils
          .getPerspectiveNamespaceString(persRootNAUS);
        expect(realtimeUtils.shouldIEmitThisObj(nspString,
          looksLikeSampleObjNAUS)).to.equal(true);
      });

      it('for should return true for roomTest', () => {
        const nspString = realtimeUtils.getBotsNamespaceString(roomTest);
        expect(realtimeUtils.shouldIEmitThisObj(nspString, roomTest, true))
        .to.equal(true);
      });

      it('should return true for botActionTest', () => {
        const nspString = realtimeUtils.getBotsNamespaceString(botActionTest);
        expect(realtimeUtils.shouldIEmitThisObj(nspString, botActionTest, true))
        .to.equal(true);
      });

      it('should return true for botEventTest', () => {
        const nspString = realtimeUtils.getBotsNamespaceString(botEventTest);
        expect(realtimeUtils.shouldIEmitThisObj(nspString, botEventTest, true))
        .to.equal(true);
      });

      it('should return true for botDataTest', () => {
        const nspString = realtimeUtils.getBotsNamespaceString(botDataTest);
        expect(realtimeUtils.shouldIEmitThisObj(nspString, botDataTest, true))
        .to.equal(true);
      });

      it('should return false for some random absolutePath', () => {
        const nspString = '/SomRandomRoom';
        expect(realtimeUtils.shouldIEmitThisObj(nspString, roomTest, true))
          .to.equal(false);
      });
    });

    describe('getPerspectiveNamespaceString tests >', () => {
      it('for perspective persNAUS', () => {
        const nspString = realtimeUtils
          .getPerspectiveNamespaceString(persRootNAUS);
        expect(nspString)
        .to.equal('/' + rootSubjNAUS + '&EXCLUDE&EXCLUDE&EXCLUDE&EXCLUDE');
      });

      it('for roomTest', () => {
        const nspString = realtimeUtils.getBotsNamespaceString(roomTest);
        expect(nspString).to.equal('/Bots&' + roomTest.name);
      });

      it('for perspective persNA', () => {
        const nspString = realtimeUtils.getPerspectiveNamespaceString(persRootNA);
        expect(nspString)
        .to.equal('/' + rootSubjNA + '&INCLUDE=' + aspectOne.name +
          ';humidity&INCLUDE=ea;' + rootSubjNA + '&INCLUDE=temp;hum&INCLUDE=OK');
      });

      it('for perspective persNAUSCA', () => {
        const nspString = realtimeUtils.getPerspectiveNamespaceString(persRootNAUSCA);
        expect(nspString)
        .to.equal('/' + rootSubjNAUSCA + '&EXCLUDE=' + aspectOne.name +
          ';humidity' + '&EXCLUDE&EXCLUDE&EXCLUDE=OK');
      });
    });

    describe('getNewObjAsString tests >', () => {
      it('getNewObjAsString returns the expected string', () => {
        const SAMPLE_ADD_KEY = 'refocus.internal.realtime.sample.add';
        const string = realtimeUtils.getNewObjAsString(SAMPLE_ADD_KEY,
          newSubject);
        expect(string).to.be.a('string');
        const obj = JSON.parse(string);
        expect(obj.hasOwnProperty(SAMPLE_ADD_KEY)).to.equal(true);
        expect(obj[SAMPLE_ADD_KEY]).to.deep.equal(newSubject);
      });
    });

    describe('parseObject tests >', () => {
      it('parse updated object', () => {
        const obj = realtimeUtils.parseObject(newSubject);
        expect(obj.hasOwnProperty('new')).to.equal(false);
      });

      it('parse newObject', () => {
        const obj = realtimeUtils.parseObject(updatedSubject);
        expect(obj.hasOwnProperty('new')).to.equal(false);
      });
    });

    describe('isIpWhitelisted >', () => {
      it('ok', () => {
        const addr = '5.6.7.805';
        const whitelist = [['1.2.3.4', '2.3.4.5'], ['5.6.7.0', '5.6.7.805']];
        expect(realtimeUtils.isIpWhitelisted(addr, whitelist)).to.equal(true);
      });

      it('not in range', () => {
        const addr = '5.6.7.805';
        const whitelist = [['1.2.3.4', '2.3.4.5'], ['5.6.7.9', '5.7.7.7']];
        try {
          realtimeUtils.isIpWhitelisted(addr, whitelist);
          expect(false);
        } catch (err) {
          expect(err).to.have.property('message',
            'IP address "5.6.7.805" is not whitelisted');
        }
      });

      it('ok when whitelist is not defined', () => {
        const addr = '5.6.7.805';
        expect(realtimeUtils.isIpWhitelisted(addr)).to.equal(true);
      });

      it('range not legit', () => {
        const addr = '5.6.7.805';
        const whitelist = [[0], ['1.2.3.4', '9.3.4.5']];
        try {
          realtimeUtils.isIpWhitelisted(addr, whitelist);
          expect(false);
        } catch (err) {
          expect(err).to.have.property('message',
            'IP address "5.6.7.805" is not whitelisted');
        }
      });
    });

    // need done in these tests, otherwise tests pass before promise returns
    describe('attachAspectSubject tests', () => {
      describe('with data from sampleStore', () => {
        it('without sample having subject and aspect objects ' +
          'attached', (done) => {

          const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
          delete sampleObj.aspect;
          delete sampleObj.subject;

          realtimeUtils.attachAspectSubject(sampleObj)
          .then((sample) => {
            expect(sample.aspect.name).to.include(aspectOne.name);
            expect(sample.subject.name).to.equal(rootSubjNA);
            sampleObj.aspect = sample.aspect;
            sampleObj.subject = sample.subject;
            expect(sample).to.deep.equal(sampleObj);
            return done();
          })
          .catch(done);
        });

        it('with sample having subject and aspect objects attached', (done) => {
          realtimeUtils.attachAspectSubject(sampleInstNA)
          .then((sample) => {
            expect(sample).to.deep.equals(sampleInstNA);
            return done();
          })
          .catch(done);
        });

        it('with sample having aspect attached but not subject ' +
          'attached', (done) => {
          const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
          delete sampleObj.subject;
          realtimeUtils.attachAspectSubject(sampleObj)
          .then((sample) => {
            expect(sample.subject.name).to.equal(rootSubjNA);
            sampleObj.subject = sample.subject;
            expect(sample).to.deep.equal(sampleObj);
            return done();
          })
          .catch(done);
        });

        it('same output with upper sample name', (done) => {
          const copySample = JSON.parse(JSON.stringify(sampleInstNA));
          copySample.name = copySample.name.toUpperCase();
          delete copySample.aspect;
          delete copySample.subject;
          realtimeUtils.attachAspectSubject(copySample)
          .then((sample) => {
            expect(sample.name).equal(copySample.name);
            expect(sample.absolutePath).to.equal(sampleInstNA
              .absolutePath);
            done();
          })
          .catch(done);
        });

        it('same output with lower sample name', (done) => {
          const copySample = JSON.parse(JSON.stringify(sampleInstNA));
          copySample.name = copySample.name.toLowerCase();
          delete copySample.aspect;
          delete copySample.subject;
          realtimeUtils.attachAspectSubject(copySample)
          .then((sample) => {
            expect(sample.name).equal(copySample.name);
            done();
          })
          .catch(done);
        });

        it('should return null when passing in a sample without ' +
          'name', (done) => {
          const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
          delete sampleObj.name;
          realtimeUtils.attachAspectSubject(sampleObj)
          .then((sample) => {
            expect(sample).to.equal(null);
            return done();
          })
          .catch(done);
        });
      });

      describe('with data from db', () => {
        before(() => tu.toggleOverride('attachSubAspFromDB', true));
        after(() => tu.toggleOverride('attachSubAspFromDB', false));

        it('without sample having subject and aspect objects ' +
          'attached', (done) => {
          const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
          delete sampleObj.aspect;
          delete sampleObj.subject;
          realtimeUtils.attachAspectSubject(sampleObj, tu.db.Subject,
            tu.db.Aspect)
          .then((sample) => {
            expect(sample.aspect.name).to.include(aspectOne.name);
            expect(Object.keys(sample.aspect).length).to.equal(23);
            expect(sample.aspect.tags).to.deep.equal(aspectOne.tags);

            expect(sample.subject).to.not.equal(null);
            expect(sample.subject.name).to.equal(rootSubjNA);
            expect(Object.keys(sample.subject).length).to.equal(4);
            expect(Object.keys(sample.subject)).to
              .include.members(['id', 'name', 'tags', 'absolutePath']);
            expect(sample.subject.absolutePath).to.equal(rootSubjNA);
            expect(sample.subject.tags).to.deep.equal(rootSubjNAObj.tags);

            sampleObj.aspect = sample.aspect;
            sampleObj.subject = sample.subject;
            expect(sample).to.deep.equal(sampleObj);
            return done();
          })
          .catch(done);
        });

        it('with sample already having subject and aspect objects ' +
          'attached', (done) => {
          realtimeUtils.attachAspectSubject(sampleInstNA, tu.db.Subject,
            tu.db.Aspect)
          .then((sample) => {
            expect(sample).to.deep.equals(sampleInstNA);
            return done();
          })
          .catch(done);
        });

        it('with sample having aspect attached but not subject ' +
          'attached', (done) => {
          const sampleObj = JSON.parse(JSON.stringify(sampleInstNA));
          delete sampleObj.subject;
          realtimeUtils.attachAspectSubject(sampleObj, tu.db.Subject,
            tu.db.Aspect)
          .then((sample) => {
            expect(sample.subject.name).to.equal(rootSubjNA);
            sampleObj.subject = sample.subject;
            expect(sample).to.deep.equal(sampleObj);
            return done();
          })
          .catch(done);
        });

        it('same output with upper sample name', (done) => {
          const copySample = JSON.parse(JSON.stringify(sampleInstNA));
          copySample.name = copySample.name.toUpperCase();
          delete copySample.aspect;
          delete copySample.subject;
          realtimeUtils.attachAspectSubject(copySample, tu.db.Subject,
            tu.db.Aspect)
          .then((sample) => {
            expect(sample.name).equal(copySample.name);
            expect(sample.absolutePath).to.equal(sampleInstNA
              .absolutePath);
            done();
          })
          .catch(done);
        });

        it('same output with lower sample name', (done) => {
          const copySample = JSON.parse(JSON.stringify(sampleInstNA));
          copySample.name = copySample.name.toLowerCase();
          delete copySample.aspect;
          delete copySample.subject;
          realtimeUtils.attachAspectSubject(copySample, tu.db.Subject,
            tu.db.Aspect)
          .then((sample) => {
            expect(sample.name).equal(copySample.name);
            done();
          })
          .catch(done);
        });
      });
    });
  });
});
